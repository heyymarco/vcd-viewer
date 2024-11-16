// models:
import {
    type Vcd,
    type VcdModule,
    type VcdVariable,
}                           from '@/models/vcd'



export const moveVcdVariableData = <TData>(originalData: TData[], moveFromIndex: number|null, moveToIndex: number|null, clone : boolean = true): TData[] => {
    // conditions:
    if (moveFromIndex === null       ) return originalData;
    if (moveToIndex   === null       ) return originalData;
    if (moveFromIndex === moveToIndex) return originalData;
    
    
    
    const clonedItems = clone ? originalData.slice(0) : originalData;
    const movedItems  = clonedItems.splice(moveFromIndex, 1 /* delete one item */); // cut one, then
    clonedItems.splice(moveToIndex, 0 /* nothing to delete */, ...movedItems);      // insert cutted one
    return clonedItems;
}



export const actionKeys    = ['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'Escape', 'ShiftLeft', 'ShiftRight'];
export const actionMouses  = [1]; // [only_left_click]
export const actionTouches = [1]; // [only_single_touch]