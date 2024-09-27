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
    const svgRef   = useRef<SVGSVGElement|null>(null);
    const rulerRef = useRef<SVGGElement|null>(null);
    
    
    
    // effects:
    useEffect(() => {
        // conditions:
        const svgElm   = svgRef.current;
        const rulerElm = rulerRef.current;
        if (!svgElm || !rulerElm) return;
        
        
        
        // setups:
        
        const resizeObserver = new ResizeObserver(({ '0': { borderBoxSize: { '0': { inlineSize } } }}) => {
            const extendSize = inlineSize / (maxTick * baseScale);
            // console.log({inlineSize, extendSize})
            const ruler = d3.scaleLinear([0, maxTick * extendSize], [0, maxTick * baseScale * extendSize]);
            d3.select(rulerRef.current).call(
                d3.axisTop(ruler) as any
            );
        });
        resizeObserver.observe(svgElm, { box: 'border-box' });
        
        
        
        // cleanups:
        return () => {
            resizeObserver.disconnect();
        }
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
            <svg ref={svgRef} className={styles.ruler}>
                <g ref={rulerRef} transform='translate(0, 20)' />
            </svg>
            {!!vcd && flatMapVariables(vcd.rootModule).map(({ waves, lsb, msb, size, name }, index) =>
                <div key={index} className={styles.variable}>
                    <div className={styles.waves}>
                        {waves.map(({tick, value}, index, waves) => {
                            const nextTick : number = (waves.length && ((index + 1) < waves.length)) ? waves[index + 1].tick : maxTick;
                            // if (nextTick === maxTick) return null;
                            const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
                            const isBinary = (size === 1);
                            
                            
                            
                            // jsx:
                            const length = (nextTick - tick) * baseScale;
                            if (length === 0) return;
                            return (
                                <span key={index} style={{ '--length': length } as any} className={cn(isError ? 'error' : undefined, isBinary ? `bin ${value ? 'hi':'lo'}` : undefined)}>
                                    {!isBinary && ((typeof(value) === 'string') ? value : value.toString(16))}
                                </span>
                            );
                        })}
                    </div>
                    {(() => {
                        const lastWave = waves.length ? waves[waves.length - 1] : undefined;
                        if (lastWave === undefined) return null; // if the last wave doesn't exist => do not render
                        const {
                            value,
                        } = lastWave;
                        
                        const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
                        const isBinary = (size === 1);
                        
                        
                        
                        // jsx:
                        return (
                            <span key={index} className={cn('last', styles.lastWave, isError ? 'error' : undefined, isBinary ? `bin ${value ? 'hi':'lo'}` : undefined)}>
                                {!isBinary && ((typeof(value) === 'string') ? value : value.toString(16))}
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
