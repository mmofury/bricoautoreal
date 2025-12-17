export const dynamic = 'force-dynamic';

export default function TestPage() {
    console.log('[TEST] Page rendering at:', new Date().toISOString());

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Test Performance</h1>
            <p>Cette page devrait charger rapidement.</p>
            <p>Temps: {new Date().toISOString()}</p>
        </div>
    );
}
