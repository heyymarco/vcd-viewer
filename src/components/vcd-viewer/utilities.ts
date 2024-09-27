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
export const getVariableMaxTick = (module: VcdModule): number => {
    return Math.max(
        ...flatMapVariables(module)
        .map(({ waves }) => waves[waves.length - 1].tick)
    );
}



export const baseScale = 2;
