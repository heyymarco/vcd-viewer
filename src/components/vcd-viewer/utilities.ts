// models:
import {
    type VcdModule,
    type VcdVariable,
}                           from '@/models/vcd'



export const flatMapVariables = (module: VcdModule): VcdVariable[] => {
    return [
        ...module.variables,
        ...module.submodules.flatMap(flatMapVariables),
    ];
}