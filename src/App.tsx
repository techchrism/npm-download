import type {Component} from 'solid-js';
import {createResource, createSignal, Show} from 'solid-js'

async function fetchLibraryLatest(id: string) {
    const response = await fetch(`https://registry.npmjs.org/${id}/latest`)
    return await response.json()
}

const App: Component = () => {
    const [libraryID, setLibraryID] = createSignal<string>()
    const [library] = createResource(libraryID, fetchLibraryLatest)

    let libraryInput: HTMLInputElement
    const onLookup = () => {
        setLibraryID(libraryInput.value)
    }

    return (
        <>
            <div class="py-20 text-center flex flex-col items-center">
                <input type="text" class="input input-bordered input-primary input-lg shadow-2xl" ref={libraryInput}/>
                <button class="btn btn-primary btn-lg mt-4" onClick={onLookup}>Lookup</button>

                <Show when={library.state === 'ready'}>
                    <div class="mt-8">
                        <pre class="text-left break-all max-w-6xl whitespace-pre-wrap">
                            {JSON.stringify(library.latest, null, 4)}
                        </pre>
                    </div>
                </Show>
            </div>
        </>

    );
};

export default App;
