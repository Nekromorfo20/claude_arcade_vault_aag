import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/data";
import { GameDetail } from "@/components/game-detail";

async function GameDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GameDetail game={game} />;
}

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <GameDetailContent params={params} />
    </Suspense>
  );
}
