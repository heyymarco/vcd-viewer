'use client'

import Image from "next/image";
// import styles from "./page.module.css";
import { parseVcdFromFileContent, VcdViewer } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'
import { useState } from "react";
import { Vcd } from "@/models";

export default function Home() {
    const [vcd, setVcd] = useState<Vcd|null>(() => parseVcdFromFileContent(vcdContent))
    return (
        <div>
            <VcdViewer value={vcd} onValueChange={setVcd} />
            <hr />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcd, undefined, 4)}
            </pre>
        </div>
    );
}
