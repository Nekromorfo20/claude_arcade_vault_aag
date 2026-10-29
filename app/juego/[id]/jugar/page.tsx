import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/data";
import { GamePlayer } from "@/components/game-player";
import { AsteroidsPlayer } from "@/components/games/asteroids-player";
async function GamePlayerContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  if (game.id === "asteroides") {
    return <AsteroidsPlayer game={game} />;
  }
  return <GamePlayer game={game} />;
}
export default function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <GamePlayerContent params={params} />
    </Suspense>
  );
}
