// models:
import {
    type Vcd,
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
        .map(({ waves }) => waves[0].tick)
    );
}
export const getVariableMaxTick = (module: VcdModule): number => {
    return Math.max(
        ...flatMapVariables(module)
        .map(({ waves }) => waves[waves.length - 1].tick)
    );
}

export const getModulesOfVariable = (vcd: Vcd, variable: VcdVariable): VcdModule[]|null => {
    return getRecursiveModulesOfVariable([], vcd.rootModule, variable);
}
const getRecursiveModulesOfVariable = (parentModules: VcdModule[], currentModule: VcdModule, variable: VcdVariable): VcdModule[]|null => {
    if (currentModule.variables.includes(variable)) return [...parentModules, currentModule];
    for (const subModule of currentModule.submodules) {
        const found = getRecursiveModulesOfVariable([...parentModules, currentModule], subModule, variable);
        if (found) return found;
    } // for
    return null
}



export const moveVcdVariableData = <TData>(originalData: TData[], moveFromIndex: number|null, moveToIndex: number|null): TData[] => {
    // conditions:
    if (moveFromIndex === null       ) return originalData;
    if (moveToIndex   === null       ) return originalData;
    if (moveFromIndex === moveToIndex) return originalData;
    
    
    
    const clonedItems = originalData.slice(0);
    const movedItems  = clonedItems.splice(moveFromIndex, 1 /* delete one item */); // cut one, then
    clonedItems.splice(moveToIndex, 0 /* nothing to delete */, ...movedItems);      // insert cutted one
    return clonedItems;
}



export const actionKeys    = ['AltLeft', 'AltRight'];
export const actionMouses  = [1]; // [only_left_click]
export const actionTouches = [1]; // [only_single_touch]