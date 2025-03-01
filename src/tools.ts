import * as child_process from "child_process";
import { spawn } from "child_process";

export function run(command: string | string[], cwd?: string): string {
  const [c, ...args] = Array.isArray(command) ? command : command.split(" ");
  const result = child_process.spawnSync(c, args, {
    encoding: "UTF8",
    env: process.env,
    stdio: "pipe",
    shell: true,
    cwd
  });

  return result.stdout
    .toString()
    .trim()
    .replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    );
}

export async function asyncRun(command: string, cwd?: string): Promise<string> {
  const [cmd, ...args] = command.split(" ");

  return new Promise<string>((result, reject) => {
    const s = spawn(cmd, args, {
      cwd: cwd,
      stdio: "pipe",
      env: process.env
    });

    // capture outputs in case commands fail
    const stdout: string[] = [];
    const stderr: string[] = [];

    if (s.stdout !== null) {
      s.stdout.on("data", data => {
        stdout.push(data.toString());
      });
    }

    s.on("close", code => {
      result(stdout.join(""));
    });
    s.on("error", e => {
      reject(e);
    });
  });
}

export interface Project {
  location: string;
  name: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: [];
}

export interface Workspace {
  [project: string]: Project;
}

export interface NpmDep {
  name: string;
  dependencies: string[]
}

export async function npmList(path: string): Promise<NpmDep> {
  const data = await asyncRun("npm list --json --silent", path);
  return JSON.parse(data) as NpmDep;
}

export function yarnWorkspaceInfo(cwd?: string): Workspace {
  const projects = run("yarn workspaces list --json -v", cwd)
    .split("\n")
    .map(x => JSON.parse(x) as Project);

  const workspace: Workspace = {};

  for (const project of projects) {
    if (project.location !== ".") {
      workspace[project.name] = project;
    }
  }

  return workspace;
}

export function changedFiles(branch: string): string[] {
  return run(`git diff --name-only ${branch}`).split("\n");
}

export function filesInStaged(): string[] {
  return run(`git diff --name-only --cached`).split("\n");
}

export function filesInCurrent(): string[] {
  return run(["git", "show", '--pretty=""', "--name-only"]).split("\n");
}

export function gitRoot(): string {
  return run("git rev-parse --show-toplevel");
}


export function resolveDependencies(workspace: Workspace, noTransitive: boolean) {
  const allDependencies = new Map<string, NpmDep>();

  const workspaceArray: (Project & { name: string })[] = [];

  // for all folders in the workspace find their dependencies
  Object.keys(workspace).map(project => {
    const workspaceInfo = workspace[project];

    workspaceArray.push({...workspaceInfo, name: project});

    if (!noTransitive) {
      allDependencies.set(project, mapDependencies(workspace, workspaceInfo));
    }
  })

  return {allDependencies, workspaceArray};
}

function mapDependencies(workspace: Workspace, project: Project): NpmDep {
  return {
    name: project.name,
    dependencies: Object.keys(workspace).filter(k => {
      const current = workspace[k]
      return project.workspaceDependencies.includes(current.location)
    }).map(k => workspace[k].name)
  }
}
