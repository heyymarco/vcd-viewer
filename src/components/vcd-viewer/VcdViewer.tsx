'use client'

import styles from './styles.module.scss'

// react:
import {
    // react:
    default as React,
    
    
    
    // hooks:
    useRef,
    useState,
    useEffect,
    useLayoutEffect,
}                           from 'react'
import cn                   from 'classnames'
import * as d3              from 'd3'

// models:
import {
    type Vcd,
}                           from '@/models/vcd'

// utilities:
import {
    flatMapVariables,
    getVariableMaxTick,
    baseScale,
}                           from './utilities'



// react components:
export interface VcdViewerProps
    extends
        // bases:
        Omit<React.HTMLAttributes<HTMLDivElement>,
            |'children' // no nested children
        >
{
    // data:
    vcd ?: Vcd|null
}
const VcdViewer = (props: VcdViewerProps): JSX.Element|null => {
    // props:
    const {
        // data:
        vcd = null,
        
        
        
        // other props:
        ...restVcdViewerProps
    } = props;
    const maxTick = !vcd ? 0 : getVariableMaxTick(vcd.rootModule);
    
    
    
    // refs:
    const rulerRef = useRef<SVGGElement|null>(null);
    
    
    
    // effects:
    useEffect(() => {
        const ruler = d3.scaleLinear([0, maxTick], [0, maxTick * baseScale]);
        d3.select(rulerRef.current).call(
            d3.axisTop(ruler) as any
        );
    }, [maxTick]);
    
    
    
    // default props:
    const {
        // TODO
        
        
        
        // other props:
        ...restIndicatorProps
    } = restVcdViewerProps;
    
    
    
    // jsx:
    return (
        <div
            // other props:
            {...restIndicatorProps}
            
            
            
            // classes:
            className={cn(props.className, styles.main)}
        >
            <svg className={styles.ruler}>
                <g ref={rulerRef} transform='translate(0, 20)' />
            </svg>
            {!!vcd && flatMapVariables(vcd.rootModule).map((variable, index) =>
                <div key={index} className={styles.variable}>
                    <div className={styles.waves}>
                        {variable.waves.map(({tick, value}, index, waves) => {
                            const nextTick : number|undefined = (waves.length && ((index + 1) < waves.length)) ? waves[index + 1].tick : undefined;
                            if (nextTick === undefined) return null; // do not render the last wave
                            
                            const length = (nextTick - tick) * baseScale;
                            return (
                                <span key={index} style={{ '--length': length } as any}>
                                    {value}
                                </span>
                            );
                        })}
                    </div>
                    {(() => {
                        const lastWave = variable.waves.length ? variable.waves[variable.waves.length - 1] : undefined;
                        if (lastWave === undefined) return null; // if the last wave doesn't exist => do not render
                        
                        return (
                            <span key={index} className={styles.lastWave}>
                                {lastWave.value}
                            </span>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
export {
    VcdViewer,            // named export for readibility
    VcdViewer as default, // default export to support React.lazy
}
