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

export const getVariableMinTick = (module: VcdModule): number => {
    return Math.min(
        ...flatMapVariables(module)
        .map(({ waves }) => waves[waves.length - 1].tick)
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
export const actionTouches = []; // [only_single_touch]