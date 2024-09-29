'use client'

import { useMemo } from "react";
import { parseVcdFromFileContent, VcdViewer } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'



export default function Home() {
    // important: always memorize the vcd (json) object to make sure it always the same object reference,
    // otherwise the <VcdViewer> resets the order state and the user's changes lost
    const vcd = useMemo(() => parseVcdFromFileContent(vcdContent), []);
    return (
        <div>
            <VcdViewer vcd={vcd} />
            <hr />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcd, undefined, 4)}
            </pre>
        </div>
    );
}
