export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          投票ボードゲーム
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          AI vs 集合知で次の一手を決める投票型ボードゲーム
        </p>
      </div>
    </main>
  );
}
