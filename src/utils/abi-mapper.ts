import { OpenAPIV3 } from "openapi-types";

// Type alias for OpenAPI Schema
type Schema = OpenAPIV3.SchemaObject;

// Map   
export function solidityTypeToSchema(solType: string, components?: any[]): Schema {
  console.log("solType: ", solType, " ::: ", "components: ", components);
  // Handle dynamic array: type[]
  if (solType.endsWith('[]')) {
    const itemType = solType.slice(0, -2);
    return {
      type: 'array',
      items: solidityTypeToSchema(itemType, components),
    };
  }

  /**
   *  const re = /^(.+?)\[(\d+)\]$/;
      const s = "foo[42]";
      const m = re.exec(s);
   */
  // Handle fixed-size array: type[M]
  const fixedArrayMatch = solType.match(/^(.+?)\[(\d+)\]$/);
  if (fixedArrayMatch) {
    const itemType = fixedArrayMatch[1];
    const size = parseInt(fixedArrayMatch[2]);
    return {
      type: 'array',
      items: solidityTypeToSchema(itemType, components),
      minItems: size,
      maxItems: size,
    };
  }

  // Handle tuple/struct
  if (solType === 'tuple' || solType.startsWith('struct')) {
    const schema: Schema = {
      type: 'object',
      properties: {},
      required: [],
    };

    if (components) {
      components.forEach((comp) => {
        if (schema.properties) {
          schema.properties[comp.name || comp.internalType || 'unnamed'] = solidityTypeToSchema(comp.type, comp.components);
          if (!comp.optional) {
            schema.required!.push(comp.name || comp.internalType || 'unnamed');
          }
        }
      });
    }

    return schema;
  }

  // Handle primitive types
  if (solType.match(/^(uint|int|fixed|ufixed)[0-9]*$/)) {
    return { type: 'integer' };
  }
  if (solType === 'bool') {
    return { type: 'boolean' };
  }
  if (solType === 'string') {
    return { type: 'string' };
  }
  if (solType === 'address') {
    return { type: 'string', format: 'ethereum-address' };
  }
  if (solType.startsWith('bytes')) {
    if (solType === 'bytes') {
      return { type: 'string', format: 'byte' };
    } else {
      return { type: 'string', maxLength: parseInt(solType.slice(5)) };
    }
  }

  // Fallback for unknown types
  console.warn(`Unknown Solidity type: ${solType}, falling back to string`);
  return { type: 'string' };
}


