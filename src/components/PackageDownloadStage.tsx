import {Component, createEffect, createMemo, createSignal, Show} from 'solid-js'
import {LibraryVersion, LoadedCache} from '../util/npmUtils'
import {BlobWriter, TextReader, ZipWriter} from '@zip.js/zip.js'
import {BiSolidDownload} from 'solid-icons/bi'

export type PackageDownloadStageProps = {
    cache: LoadedCache
}

const PackageDownloadStage: Component<PackageDownloadStageProps> = (props) => {
    const [loading, setLoading] = createSignal(false)
    const [progress, setProgress] = createSignal(0)
    const [current, setCurrent] = createSignal<LibraryVersion | null>(null)
    const [zipBlob, setZipBlob] = createSignal<Blob | null>(null)

    const downloadZipBlob = () => {
        const downloadLink = document.createElement('a')
        downloadLink.style.display = 'none'
        downloadLink.href = window.URL.createObjectURL(zipBlob())
        downloadLink.download = 'packages.zip'
        document.body.appendChild(downloadLink)
        downloadLink.click()

        // Cleanup
        window.URL.revokeObjectURL(downloadLink.href)
        document.body.removeChild(downloadLink)
    }

    createEffect(() => {
        // React on props.cache change
        props.cache

        setZipBlob(null)
    })

    const packagesToDownload = createMemo(() => {
        return [...props.cache.values()].reduce<LibraryVersion[]>((acc, val) => {
            for(const version of val.dependedBy.keys()) {
                acc.push({
                    name: val.registry.name,
                    version
                })
            }
            return acc
        }, [])
    })

    const downloadPackages = async () => {
        if(zipBlob() !== null) {
            downloadZipBlob()
            return
        }

        setLoading(true)
        setProgress(0)
        const zipWriter = new ZipWriter(new BlobWriter('application/zip'))

        for(const pkg of packagesToDownload()) {
            setCurrent(pkg)

            const registry = props.cache.get(pkg.name).registry
            const tarball = registry.versions[pkg.version].dist.tarball

            const tarballResponse = await fetch(tarball)
            await zipWriter.add(`${pkg.name}/registry.json`, new TextReader(JSON.stringify(registry)))
            await zipWriter.add(`${pkg.name}/versions/${pkg.version}.tgz`, tarballResponse.body)

            setProgress(progress() + 1)
        }

        setZipBlob(await zipWriter.close())
        setCurrent(null)
        setLoading(false)
        downloadZipBlob()
    }

    return (
        <>
            <button onClick={downloadPackages} class="btn btn-success btn-lg">
                <Show when={loading()} fallback={(
                    <>
                        <BiSolidDownload />
                        Download {packagesToDownload().length} Package{packagesToDownload().length === 1 ? '' : 's'}
                    </>
                )}>
                    <div class="loading loading-spinner loading-lg"></div>
                    <Show when={current() !== null}>
                        <div>Downloading {current().name}@{current().version}</div>
                    </Show>
                    <div>{progress()} / {packagesToDownload().length}</div>
                </Show>
            </button>
        </>
    )
}

export default PackageDownloadStage