# Introducción a las Expresiones Regulares en TypeScript para Principiantes

¡Hola, desarrolladores! 👋 Si estás comenzando con TypeScript y te has topado con algo llamado "expresiones regulares" que parece sacado de otro planeta, ¡no te preocupes! En este artículo te explicaré de manera sencilla qué son, para qué sirven y cómo usarlas en TypeScript.

## ¿Qué son las Expresiones Regulares?

Las expresiones regulares (o *regex* para los amigos) son secuencias de caracteres que forman un patrón de búsqueda. Son como un lenguaje secreto que nos permite encontrar, validar o reemplazar texto de manera muy poderosa.

## ¿Por qué usar Expresiones Regulares con TypeScript?

TypeScript, al ser un superconjunto de JavaScript, hereda toda la funcionalidad de expresiones regulares de JavaScript, pero con el beneficio del tipado estático. Esto significa que podemos escribir código más seguro y mantenible.

## Los Básicos: Creando tu Primera Expresión Regular

En TypeScript, puedes crear una expresión regular de dos formas:

```typescript
// Usando la notación literal (recomendada cuando el patrón es fijo)
const regex1 = /patrón/;

// Usando el constructor RegExp (útil cuando el patrón es dinámico)
const regex2 = new RegExp('patrón');
```

## Banderas Comunes

Las banderas modifican cómo se realiza la búsqueda:

- `i`: Búsqueda insensible a mayúsculas/minúsculas
- `g`: Búsqueda global (encuentra todas las coincidencias)
- `m`: Búsqueda multilínea

```typescript
const regex = /hola/gi; // Busca 'hola' sin importar mayúsculas, en todo el texto
```

## Caracteres Especiales Útiles

- `.`: Cualquier carácter excepto nueva línea
- `\d`: Cualquier dígito (0-9)
- `\w`: Cualquier carácter alfanumérico o guión bajo
- `\s`: Cualquier espacio en blanco
- `^`: Inicio de la cadena
- `$`: Fin de la cadena

## Ejemplos Prácticos

### 1. Validar un Email

```typescript
function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

console.log(validarEmail('usuario@ejemplo.com')); // true
console.log(validarEmail('no-es-un-email'));      // false
```

### 2. Extraer Números de un Texto

```typescript
function extraerNumeros(texto: string): number[] {
  const regex = /\d+/g;
  return texto.match(regex)?.map(Number) || [];
}

const resultado = extraerNumeros('Tengo 3 manzanas y 5 naranjas');
console.log(resultado); // [3, 5]
```

### 3. Reemplazar Texto

```typescript
function formatearTelefono(telefono: string): string {
  return telefono.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

console.log(formatearTelefono('1234567890')); // (123) 456-7890
```

## Consejos para Principiantes

1. **Empieza simple**: No intentes crear expresiones regulares complejas de una vez.
2. **Prueba en línea**: Usa herramientas como [regex101.com](https://regex101.com/) para probar tus patrones.
3. **Comenta tus regex**: Son difíciles de leer, así que añade comentarios explicativos.
4. **Divide y vencerás**: Para patrones complejos, divídelos en partes más pequeñas.

## Recursos para Aprender Más

- [MDN - Expresiones Regulares](https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Regular_Expressions)
- [RegExr](https://regexr.com/) - Para practicar y probar expresiones regulares
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#regular-expression-types)

## Conclusión

Las expresiones regulares son una herramienta poderosa en tu cinturón de herramientas como desarrollador TypeScript. Aunque pueden parecer intimidantes al principio, con práctica y paciencia, te permitirán resolver problemas complejos de procesamiento de texto de manera elegante y eficiente.

¿Listo para poner en práctica lo aprendido? ¡Atrévete a experimentar con expresiones regulares en tu próximo proyecto TypeScript!

¿Tienes alguna pregunta o quieres compartir tus propios ejemplos? ¡Déjalos en los comentarios! 💬
