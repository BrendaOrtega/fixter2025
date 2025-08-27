/**
 * Configuración de Subagentes
 * 
 * Registro centralizado de todos los subagentes disponibles en el proyecto.
 * Facilita la gestión y descubrimiento de subagentes para el Task tool.
 */

export interface SubagentConfig {
  id: string;
  name: string;
  description: string;
  filePath: string;
  category: string;
  version: string;
  author: string;
  commands: {
    run: string;
    help: string;
    force?: string;
  };
  capabilities: string[];
  dependencies: string[];
  outputFormat: 'json' | 'text' | 'mixed';
}

/**
 * Registro de subagentes disponibles
 */
export const SUBAGENTS_REGISTRY: Record<string, SubagentConfig> = {
  'epub-generator': {
    id: 'epub-generator',
    name: 'EPUB Generator',
    description: 'Subagente especializado para generar archivos EPUB del libro "Dominando Claude Code"',
    filePath: './epub-generator.ts',
    category: 'content',
    version: '1.0.0',
    author: 'FixterGeek',
    commands: {
      run: 'npx tsx epub-generator.ts',
      help: 'npx tsx epub-generator.ts --help',
      force: 'npx tsx epub-generator.ts --force'
    },
    capabilities: [
      'Verificar modificaciones en capítulos',
      'Generar EPUB usando script Python',
      'Validar integridad del archivo generado',
      'Devolver información detallada del resultado'
    ],
    dependencies: ['python3', 'ebooklib', 'markdown'],
    outputFormat: 'json'
  }
};

/**
 * Categorías de subagentes
 */
export const SUBAGENT_CATEGORIES = {
  content: 'Gestión de Contenido',
  automation: 'Automatización',
  analysis: 'Análisis',
  deployment: 'Despliegue',
  testing: 'Testing'
} as const;

/**
 * Obtener información de un subagente por ID
 */
export function getSubagentConfig(id: string): SubagentConfig | null {
  return SUBAGENTS_REGISTRY[id] || null;
}

/**
 * Listar todos los subagentes disponibles
 */
export function listSubagents(): SubagentConfig[] {
  return Object.values(SUBAGENTS_REGISTRY);
}

/**
 * Obtener subagentes por categoría
 */
export function getSubagentsByCategory(category: string): SubagentConfig[] {
  return Object.values(SUBAGENTS_REGISTRY).filter(
    subagent => subagent.category === category
  );
}

/**
 * Buscar subagentes por capacidad
 */
export function searchSubagentsByCapability(capability: string): SubagentConfig[] {
  return Object.values(SUBAGENTS_REGISTRY).filter(
    subagent => subagent.capabilities.some(cap => 
      cap.toLowerCase().includes(capability.toLowerCase())
    )
  );
}

/**
 * Validar que un subagente tiene todas las dependencias necesarias
 */
export async function validateSubagentDependencies(id: string): Promise<{
  valid: boolean;
  missingDependencies: string[];
}> {
  const config = getSubagentConfig(id);
  if (!config) {
    return { valid: false, missingDependencies: ['Subagent not found'] };
  }

  const missingDependencies: string[] = [];
  
  // Aquí se podría implementar validación real de dependencias
  // Por ahora, asumimos que están disponibles
  
  return {
    valid: missingDependencies.length === 0,
    missingDependencies
  };
}

/**
 * Generar comando completo para ejecutar un subagente
 */
export function buildSubagentCommand(
  id: string, 
  action: 'run' | 'help' | 'force' = 'run',
  additionalArgs: string[] = []
): string | null {
  const config = getSubagentConfig(id);
  if (!config) {
    return null;
  }

  let baseCommand: string;
  
  switch (action) {
    case 'help':
      baseCommand = config.commands.help;
      break;
    case 'force':
      baseCommand = config.commands.force || config.commands.run;
      break;
    default:
      baseCommand = config.commands.run;
  }

  if (additionalArgs.length > 0) {
    baseCommand += ' ' + additionalArgs.join(' ');
  }

  return baseCommand;
}