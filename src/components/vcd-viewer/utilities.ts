// models:
import {
    type VcdModule,
    type VcdSignal,
}                           from '@/models/vcd'



export const flatMapSignals = (module: VcdModule): VcdSignal[] => {
    return [
        ...module.signals,
        ...module.submodules.flatMap(flatMapSignals),
    ];
}