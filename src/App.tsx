import type {Component} from 'solid-js';
import {createMemo, createResource, createSignal, Show} from 'solid-js'
import semver from 'semver'
import {LibraryVersion, loadAllDependencies} from './npmUtils'
import PackageSelectionStage from './components/PackageSelectionStage'

interface RegistryResponse {
    name: string
    'dist-tags': {
        latest: string
    }
    versions: {
        [key: string]: {
            name: string
            version: string
            scripts?: {
                [key: string]: string
            }
            dependencies?: {
                [key: string]: string
            }
            devDependencies?: {
                [key: string]: string
            }
            peerDependencies?: {
                [key: string]: string
            }
            optionalDependencies?: {
                [key: string]: string
            }
            dist: {
                tarball: string
            }
            hasInstallScript?: boolean
        }
    }
}

async function fetchLibraryLatest(id: string): Promise<RegistryResponse> {
    const response = await fetch(`https://registry.npmjs.org/${id}`, {
        headers: {
            'Accept': 'application/vnd.npm.install-v1+json'
        }
    })
    return await response.json()
}

const App: Component = () => {
    const [libraryID, setLibraryID] = createSignal<string>()
    const [libraryVersion, setLibraryVersion] = createSignal<string>()
    const [dependencies, setDependencies] = createSignal<LibraryVersion[]>([])

    const [library] = createResource(libraryID, fetchLibraryLatest)
    const foundVersion = createMemo(() => {
        const libraryData = library.latest
        if(libraryData === undefined) return

        if(libraryVersion() === '') {
            return libraryData.versions[libraryData['dist-tags'].latest]
        }

        const maxSatisfying = semver.maxSatisfying(Object.values(libraryData.versions).map(v => v.version), libraryVersion())
        if(maxSatisfying === null) {
            return null
        }
        return Object.values(libraryData.versions).find(v => v.version === maxSatisfying)
    })

    let libraryInput: HTMLInputElement
    const onLookup = () => {
        const [id, version] = libraryInput.value.split('@')
        setLibraryID(id)
        setLibraryVersion(version ?? '')
    }

    const loadRecursive = async () => {
        const dependencies = foundVersion().dependencies ?? {}
        const dependencyArr: LibraryVersion[] = Object.entries(dependencies).map(([name, version]) => ({name, version}))

        const loaded = await loadAllDependencies([{
            name: libraryID(),
            version: foundVersion().version
        }])
        console.log(loaded)
        window['loadedData'] = loaded
    }

    return (
        <>
            <div class="py-20 text-center flex flex-col items-center">
                <PackageSelectionStage onDependenciesChange={setDependencies}/>

                <input type="text" class="input input-bordered border-2 input-primary input-lg focus:shadow-2xl" ref={libraryInput}/>
                <button class="btn btn-primary btn-lg mt-4" onClick={onLookup}>Lookup {dependencies().length} dependencies</button>

                <Show when={library.state === 'ready'}>
                    <div class="mt-8">
                        <pre class="text-left break-all max-w-6xl whitespace-pre-wrap">
                            {JSON.stringify(foundVersion(), null, 4)}
                        </pre>
                    </div>

                    <button class="btn btn-success" onclick={loadRecursive}>Load Recursive</button>
                </Show>
            </div>
        </>

    );
};

export default App
