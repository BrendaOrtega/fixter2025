interface SandboxBackend {
  name: string;
  prewarm?(opts: { templateKey; bootstrap; seedFiles }): Promise<void>;
  create(opts: { templateKey; sessionKey; existingMetadata }): Promise<SandboxSession>;
}
interface SandboxSession {
  run({ command }): Promise<{ exitCode; stdout; stderr }>;
  writeTextFile({ path, content }): Promise<void>;
  readTextFile({ path }): Promise<string | null>;
  stop(): Promise<void>;
  delete(): Promise<void>;
  captureState(): { backendName; sessionKey; metadata };
}
// los cuatro que trae eve, en el orden en que los prueba
defaultBackend()  // Vercel Sandbox → Docker → microsandbox → just-bash
vercel()
docker({ networkPolicy: "deny-all" })
microsandbox()
justbash()
