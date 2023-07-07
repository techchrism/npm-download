import type {Component} from 'solid-js';
import {createSignal} from 'solid-js'
import {LibraryVersion, LoadedCache} from './npmUtils'
import PackageSelectionStage from './components/PackageSelectionStage'
import PackageLookupStage from './components/PackageLookupStage'

const App: Component = () => {
    const [dependencies, setDependencies] = createSignal<LibraryVersion[]>([])
    const [cache, setCache] = createSignal<LoadedCache>(new Map())

    return (
        <>
            <div class="py-20 text-center flex flex-col items-center space-y-5">
                <PackageSelectionStage onDependenciesChange={setDependencies}/>
                <div class="divider"/>
                <PackageLookupStage packages={dependencies()} onCacheChange={setCache}/>
            </div>
        </>
    );
};

export default App
