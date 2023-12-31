import {Component, createMemo, createSignal, For, Show} from 'solid-js'
import {LibraryVersion, loadAllDependencies, loadDependenciesRecursive, LoadedCache} from '../util/npmUtils'
import {FiSearch} from 'solid-icons/fi'
import {BsCheckLg} from 'solid-icons/bs'
import semver from 'semver'

export type PackageLookupStageProps = {
    packages: LibraryVersion[]
    onCacheChange: (cache: LoadedCache) => void
}

const PackageLookupStage: Component<PackageLookupStageProps> = (props) => {
    const [packagesLoaded, setPackagesLoaded] = createSignal(0)
    const [loading, setLoading] = createSignal(false)
    const [cache, setCache] = createSignal<LoadedCache>(new Map())
    const [errors, setErrors] = createSignal<{error: Error, lib: LibraryVersion}[]>([])

    const [loadingOptional, setLoadingOptional] = createSignal<LibraryVersion | undefined>(undefined)

    createMemo(() => props.onCacheChange(cache()))

    const onClick = async () => {
        if(loading()) return

        setLoading(true)

        setCache(new Map())
        setPackagesLoaded(0)
        setErrors([])
        const newCache = await loadAllDependencies(props.packages, {
            dependencyListCallback: list => setPackagesLoaded(list.length),
            errorCallback: (error, lib) => setErrors([...errors(), {error, lib}])
        })
        setCache(newCache)

        setLoading(false)
    }

    const optionalDependencies = createMemo(() => {
        const optionalVersions: {
            library: LibraryVersion
            from: LibraryVersion
        }[] = []

        const packages = cache().values()
        for(const pkg of packages) {
            const versions = pkg.dependedBy.keys()
            for(const version of versions) {
                const optional = Object.entries(pkg.registry.versions[version].optionalDependencies ?? {}).map(([name, version]) => ({name, version}))
                for(const opt of optional) {
                    if(optionalVersions.some(v => v.library.name === opt.name && v.library.version === opt.version)) continue

                    optionalVersions.push({
                        library: opt,
                        from: {name: pkg.registry.name, version}
                    })
                }
            }
        }

        return optionalVersions
    })

    const flatCache = createMemo(() => {
        const packageVersions: {
            library: LibraryVersion
            from: (LibraryVersion | 'root')[]
            hasInstallScript: boolean
        }[] = []

        const packages = cache().values()
        for(const pkg of packages) {
            for(const [version, by] of pkg.dependedBy.entries()) {
                packageVersions.push({
                    library: {name: pkg.registry.name, version},
                    from: by,
                    hasInstallScript: pkg.registry.versions[version].hasInstallScript
                })
            }
        }
        return packageVersions
    })

    const postInstallDependencies = createMemo(() => {
        return flatCache().filter(v => v.hasInstallScript)
    })

    const loadExtraDependency = async (pkg: LibraryVersion, dependent: LibraryVersion) => {
        if(loadingOptional() !== undefined) return
        setLoadingOptional(pkg)
        const cacheCopy = new Map(cache())
        await loadDependenciesRecursive(dependent, [pkg], cacheCopy, {
            dependencyListCallback: list => setPackagesLoaded(list.length),
            errorCallback: (error, lib) => setErrors([...errors(), {error, lib}])
        })
        setCache(cacheCopy)
        setLoadingOptional(undefined)
    }

    return (
        <>
            <div class="flex flex-col space-y-2">
                <button class="btn btn-primary btn-lg mt-4 cursor-default" onClick={onClick} disabled={props.packages.length === 0 || loading()}>
                    <Show when={loading()} fallback={(<>
                        <FiSearch />
                    </>)}>
                        <span class="loading loading-spinner"/>
                    </Show>
                    Lookup {props.packages.length} dependenc{props.packages.length === 1 ? 'y' : 'ies'}
                </button>

                <Show when={errors().length > 0}>
                    <div class="alert alert-error block">
                        <div class="text-xl font-semibold">Errors</div>
                        <ul class="list-disc list-inside block">
                            <For each={errors()}>{err => (
                                <li>{err.lib.name} {err.lib.version} - {err.error.message}</li>
                            )}</For>
                        </ul>
                    </div>
                </Show>

                <Show when={packagesLoaded() > 0}>
                    <div tabindex="0" class="collapse collapse-arrow border border-info">
                        <input type="checkbox"/>
                        <div class="collapse-title text-xl font-medium">
                            Loaded {packagesLoaded()} package{packagesLoaded() === 1 ? '' : 's'}
                        </div>
                        <div class="collapse-content">
                            <table class="table">
                                <thead>
                                <tr>
                                    <th>Library</th>
                                    <th>Depended By</th>
                                </tr>
                                </thead>
                                <tbody>
                                <For each={flatCache()} children={pkg => {
                                    return (
                                        <>
                                            <tr>
                                                <td>{pkg.library.name} {pkg.library.version}</td>
                                                <td>{pkg.from.map(v => (v === 'root') ? 'input box' : `${v.name} ${v.version}`).join(', ')}</td>
                                            </tr>
                                        </>
                                    )
                                }}/>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Show>

                <Show when={optionalDependencies().length > 0}>
                    <div class="divider"/>
                    <div class="text-xl font-semibold">Optional Dependencies</div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Library</th>
                                <th>Depended By</th>
                            </tr>
                        </thead>
                        <tbody>
                            <For each={optionalDependencies()} children={pkg => {
                                const currentlyLoading = createMemo(() => {
                                    return loadingOptional() !== undefined && loadingOptional().name === pkg.library.name && loadingOptional().version === pkg.library.version
                                })

                                return (
                                    <>
                                        <tr>
                                            <td class="text-center mx-auto">
                                                <Show when={[...(cache().get(pkg.library.name)?.dependedBy?.keys() ?? [])].some(k => semver.satisfies(k, pkg.library.version))} fallback={
                                                    <button class="btn btn-sm btn-primary" disabled={loadingOptional() !== undefined && !currentlyLoading()} onClick={e => loadExtraDependency(pkg.library, pkg.from)}>
                                                        <Show when={currentlyLoading()} fallback={
                                                            <FiSearch />
                                                        }>
                                                            <span class="loading loading-spinner"/>
                                                        </Show>
                                                    </button>
                                                }>
                                                    <BsCheckLg class="mx-auto"/>
                                                </Show>

                                            </td>
                                            <td>{pkg.library.name} {pkg.library.version}</td>
                                            <td>{pkg.from.name} {pkg.from.version}</td>
                                        </tr>
                                    </>
                                )
                            }}/>
                        </tbody>
                    </table>
                </Show>

                <Show when={postInstallDependencies().length > 0}>
                    <div class="divider"/>
                    <div class="text-xl font-semibold alert alert-warning">{postInstallDependencies().length} Dependenc{postInstallDependencies().length === 1 ? 'y' : 'ies'} With Post-Install Scripts:</div>
                    <table class="table">
                        <thead>
                        <tr>
                            <th>Library</th>
                            <th>Depended By</th>
                        </tr>
                        </thead>
                        <tbody>
                        <For each={postInstallDependencies()} children={pkg => {
                            return (
                                <>
                                    <tr>
                                        <td>{pkg.library.name} {pkg.library.version}</td>
                                        <td>{pkg.from.map(v => (v === 'root') ? 'input box' : `${v.name} ${v.version}`).join(', ')}</td>
                                    </tr>
                                </>
                            )
                        }}/>
                        </tbody>
                    </table>
                </Show>
            </div>
        </>
    )
}

export default PackageLookupStage