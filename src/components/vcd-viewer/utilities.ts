// models:
import {
    type VcdModule,
    type VcdVariable,
    type FlattenedVcdVariable,
}                           from '@/models/vcd'



export const flatMapVariables = (module: VcdModule, index: number = -1, array: VcdModule[] = [], parentModules: VcdModule[] = []): FlattenedVcdVariable[] => {
    return [
        ...module.variables.map((variable) => ({ ...variable, modules: [module, ...parentModules] }) satisfies FlattenedVcdVariable),
        ...module.submodules.flatMap((subModule, index, array) => flatMapVariables(subModule, index, array, [module, ...parentModules])),
    ];
}

export const getVariableMinTick = (module: VcdModule): number => {
    return Math.min(
        ...flatMapVariables(module)
        .map(({ waves }) => waves[0].tick)
    );
}
export const getVariableMaxTick = (module: VcdModule): number => {
    return Math.max(
        ...flatMapVariables(module)
        .map(({ waves }) => waves[waves.length - 1].tick)
    );
}



export const actionKeys    = ['AltLeft', 'AltRight'];
export const actionMouses  = [1]; // [only_left_click]
export const actionTouches = [1]; // [only_single_touch]