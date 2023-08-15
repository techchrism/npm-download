import semver from 'semver'

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
export interface LibraryVersion {name: string, version: string}

// Name to exact version to LibraryVersion
export type LoadedCache = Map<string, {
    registry: RegistryResponse
    // exact version
    dependedBy: Map<string, Array<LibraryVersion | 'root'>>
}>

async function fetchLibrary(id: string): Promise<RegistryResponse> {
    const response = await fetch(`https://registry.npmjs.org/${id}`, {
        headers: {
            'Accept': 'application/vnd.npm.install-v1+json'
        }
    })
    return await response.json()
}

export async function loadDependenciesRecursive(dependent: LibraryVersion | 'root', dependencies: LibraryVersion[], loadedCache: LoadedCache, dependencyListCallback?: (dependencies: LibraryVersion[]) => void) {
    for(const dependency of dependencies) {
        const loaded = await (async (): Promise<LoadedCache extends Map<any, infer I> ? I : never> => {
            const existingLoaded = loadedCache.get(dependency.name)
            if(existingLoaded !== undefined) {
                return existingLoaded
            } else {
                const registry = await fetchLibrary(dependency.name)
                const loadedData = {
                    registry,
                    dependedBy: new Map()
                }
                loadedCache.set(dependency.name, loadedData)
                return loadedData
            }
        })()

        const versionsToDownload = new Set<string>()
        // Add both the latest satisfying version and the exact version
        // This is done because npm attempts to download the exact version
        versionsToDownload.add(semver.maxSatisfying(Object.values(loaded.registry.versions).map(v => v.version), dependency.version))
        versionsToDownload.add(semver.coerce(dependency.version).raw)

        for(const version of versionsToDownload) {
            const existingDependency = loaded.dependedBy.get(version)
            if(existingDependency === undefined) {
                loaded.dependedBy.set(version, [dependent])

                // Call callback
                if(dependencyListCallback !== undefined) {
                    const dependencies = []
                    for(const [name, data] of loadedCache.entries()) {
                        for(const [version, dependedBy] of data.dependedBy.entries()) {
                            dependencies.push({name, version})
                        }
                    }
                    dependencyListCallback(dependencies)
                }

                // Load dependencies of this new version, excluding optional dependencies
                const dependencies = Object.entries(loaded.registry.versions[version].dependencies ?? {})
                    .map(([name, version]) => ({name, version}))
                    .filter(dep => loaded.registry.versions[version].optionalDependencies?.[dep.name] !== dep.version)
                await loadDependenciesRecursive({name: dependency.name, version: version}, dependencies, loadedCache, dependencyListCallback)
            } else {
                existingDependency.push(dependent)
            }
        }

    }
}

export async function loadAllDependencies(dependencies: LibraryVersion[], dependencyListCallback?: (dependencies: LibraryVersion[]) => void) {
    const loadedCache: LoadedCache = new Map()
    await loadDependenciesRecursive('root', dependencies, loadedCache, dependencyListCallback)
    return loadedCache
}