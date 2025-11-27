declare module 'shacl-engine/Validator.js' {
  import { DatasetCore, Quad, DataFactory } from '@rdfjs/types';

  export interface ValidatorOptions {
    factory?: DataFactory;
    coverage?: boolean;
    debug?: boolean;
    details?: boolean;
    trace?: boolean;
    validations?: Map<string, any>;
    [key: string]: any;
  }

  export default class Validator {
    constructor(dataset: DatasetCore, options: ValidatorOptions);
    validate(data: { dataset: DatasetCore }, shapes?: any[]): Promise<any>;
  }
}

