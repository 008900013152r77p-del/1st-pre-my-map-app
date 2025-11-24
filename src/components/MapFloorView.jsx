import React, { useEffect, useRef } from "react";

export default function MapFloorView({ route, places, stepIndex }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!route || !places || places.length === 0) return; // 空なら描画せず終了
        if (!route || !places) return;

        console.log("route:", route);
        console.log("places:", places);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // キャンバスサイズ
        const canvasWidth = 600;
        const canvasHeight = canvasWidth * 3 / 4;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        if (!route || route.length === 0) return;

        // 現在ステップ
        const currentStep = route[stepIndex];
        const currentNode = places.find(p => p.id === currentStep.id);
        if (!currentNode) return;

        // 階判定
        const floorMap = { "1F": 0, "2F": 2000, "3F": 4000 };
        const floorOffsetY = floorMap[currentNode.floor] ?? 0;

        // 現在階のルート（visibleのみ）
        const floorRoute = route.filter(r => {
            const n = places.find(p => p.id === r.id);
            if (!n) return true; // 安全策
            return n.floor === currentNode.floor && n.category !== "中継";
        });

        // 座標変換
        const toCanvasX = x => (x / 2000) * canvasWidth;
        const toCanvasY = y => ((y - floorOffsetY) / 1500) * canvasHeight;

        // --- ルート線（中継含む） ---
        ctx.strokeStyle = "#007bff";
        ctx.lineWidth = 3;
        ctx.beginPath();

        let lastDrawn = null;

        for (let i = 0; i < route.length; i++) {
            const node = places.find(p => p.id === route[i].id);
            if (!node) continue;

            // 線を引くかの判定
            const canDraw =
                lastDrawn &&
                !(lastDrawn.category === "階段" && node.category === "階段") && // 階段→階段は描かない
                (lastDrawn.floor === currentNode.floor || node.floor === currentNode.floor); // 現在階に関わるものだけ

            const x = toCanvasX(node.x);
            const y = toCanvasY(node.y);

            if (!lastDrawn || !canDraw) {
                // 新しい線の開始点
                ctx.moveTo(x, y);
            } else {
                // 線を引く
                ctx.lineTo(x, y);
            }

            lastDrawn = node;
        }

        ctx.stroke();

        // --- ノード丸表示（visibleのみ） ---
        floorRoute.forEach(step => {
            const node = places.find(p => p.id === step.id);
            if (!node) return;
            const x = toCanvasX(node.x);
            const y = toCanvasY(node.y);
            ctx.fillStyle = "#007bff";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });


        let toNode = null;
        const currentIndex = route.findIndex(r => r.id === currentStep.id);
        const fromNode = currentNode;

        // 前ノード（visibleも中継も含む）
        const prevNode = currentIndex > 0 ? places.find(p => p.id === route[currentIndex - 1].id) : null;

        // 中継含む次のノードを取得
        for (let i = currentIndex + 1; i < route.length; i++) {
            const n = places.find(p => p.id === route[i].id);
            if (n) {
                toNode = n;
                break;
            }
        }

        // 矢じりの向きを決定
        let arrowTargetNode = toNode;


        // 最後のステップの場合は前ノード方向に反転
        let isLastStep = false;
        if (!arrowTargetNode && prevNode) {
            arrowTargetNode = prevNode;
            isLastStep = true;
        }

        if (arrowTargetNode) {
            const cx = toCanvasX(fromNode.x);
            const cy = toCanvasY(fromNode.y);
            const tx = toCanvasX(arrowTargetNode.x);
            const ty = toCanvasY(arrowTargetNode.y);

            // デフォルトは次ノード方向
            let angle = Math.atan2(ty - cy, tx - cx);

            // --- 階段上り下り前判定 ---
            if (
                fromNode.category === "階段" &&
                toNode &&
                toNode.category === "階段" &&
                fromNode.name === toNode.name &&
                fromNode.floor !== toNode.floor
            ) {
                // 上り下り前は前ノード方向に矢じりを向け、さらに180度回転
                if (prevNode) {
                    const px = toCanvasX(prevNode.x);
                    const py = toCanvasY(prevNode.y);
                    angle = Math.atan2(py - cy, px - cx) + Math.PI; // ← ここで180度回転
                }
            }

            if (isLastStep) angle += Math.PI; // 最後のステップは前ノード方向に反転

            const size = 20;      // 矢じりの長さ
            const baseWidth = 16; // 矢じりの底辺

            ctx.fillStyle = "red";
            ctx.beginPath();
            // 尖端
            ctx.moveTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
            // 左側
            ctx.lineTo(
                cx + (-size * 0.5) * Math.cos(angle) + (baseWidth * 0.5) * Math.cos(angle + Math.PI / 2),
                cy + (-size * 0.5) * Math.sin(angle) + (baseWidth * 0.5) * Math.sin(angle + Math.PI / 2)
            );
            // 右側
            ctx.lineTo(
                cx + (-size * 0.5) * Math.cos(angle) + (baseWidth * 0.5) * Math.cos(angle - Math.PI / 2),
                cy + (-size * 0.5) * Math.sin(angle) + (baseWidth * 0.5) * Math.sin(angle - Math.PI / 2)
            );
            ctx.closePath();
            ctx.fill();
        }

    }, [route, stepIndex, places]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full aspect-[4/3] rounded-lg border border-gray-300 shadow"
            style={{ maxHeight: "450px" }}
        />

    );
}
