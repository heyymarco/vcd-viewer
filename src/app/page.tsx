'use client'

import { useState } from "react";
import { parseVcdFromFileContent, VcdViewer, VcdEditor } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'
import { useEvent } from "@reusable-ui/core";
import { VcdValueFormat, type Vcd } from "@/models";
import Color from 'color'



const blankSampleVcd : Vcd|null = {
    version                    : 'A sample blank vcd',
    timescale                  : 0.1**9,
    rootModule                 : {
        name                   : 'root',
        variables              : [],
        submodules             : [
            {
                name           : 'sample',
                variables      : [
                    {
                        name   : 'clock',
                        alias  : 'c',
                        
                        type   : 'wire',
                        size   : 1,
                        lsb    : 0,
                        msb    : 1,
                        waves  : (new Array(100)).fill(null).map((_, index) => ({
                            tick  : index * 5,
                            value : index % 2,
                        })),
                        
                        id     : 1,
                        format : VcdValueFormat.BINARY,
                        color  : Color('#ff0000'),
                    },
                    {
                        name   : 'random',
                        alias  : 'r',
                        
                        type   : 'reg',
                        size   : 8,
                        lsb    : 0,
                        msb    : 7,
                        waves  : (new Array(25)).fill(null).map((_, index) => ({
                            tick  : index * 20,
                            value : Math.round(Math.random() * 1000) % 8,
                        })),
                        
                        id     : 1,
                        format : VcdValueFormat.HEXADECIMAL,
                        color  : Color('purple'),
                    },
                ],
                submodules : [],
            }
        ],
    },
};



export default function Home() {
    const [vcd, setVcd] = useState<Vcd|null>(() => parseVcdFromFileContent(vcdContent));
    const [vcdVersion, setVcdVersion] = useState<any>(() => new Date());
    const handleFileOpen = useEvent<React.ChangeEventHandler<HTMLInputElement>>(async (event) => {
        const file : File|null = event.currentTarget.files?.[0] ?? null;
        if (!file) return;
        
        const fileContent = await file.text();
        const newVcd = parseVcdFromFileContent(fileContent);
        setVcd(newVcd);
        setVcdVersion(new Date(file.lastModified));
    });
    
    
    
    return (
        <div>
            <div style={{ display: 'grid', height: '70vh' }}>
                <VcdEditor
                    vcd={vcd}
                    onVcdChange={setVcd}
                    vcdVersion={vcdVersion}
                    
                    // a new document:
                    vcdBlank={blankSampleVcd}
                />
            </div>
            <hr />
            <p>
                Open a *.vcd file from your computer:
            </p>
            <input type='file' accept='.vcd' onChange={handleFileOpen} multiple={false} />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcd, undefined, 4)}
            </pre>
        </div>
    );
}
