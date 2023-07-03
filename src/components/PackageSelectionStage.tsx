import {Component, createSignal, createUniqueId, Show} from 'solid-js'
import {TbFileUpload} from 'solid-icons/tb'
import {LibraryVersion} from '../npmUtils'

export type PackageSelectionStageProps = {
    onDependenciesChange: (dependencies: LibraryVersion[]) => void
}

const PackageSelectionStage: Component<PackageSelectionStageProps> = (props) => {
    const inputID = createUniqueId()
    const fileInputID = createUniqueId()

    const [inputError, setInputError] = createSignal('')
    let inputElement: HTMLTextAreaElement
    let fileInputElement: HTMLInputElement

    const loadFromJson = async () => {
        try {
            const text = await fileInputElement.files?.[0]?.text()
            if(text === undefined) return

            setInputError('')
            const data = JSON.parse(text)

            const loadDependencies = key => Object.entries(data[key] ?? {}).map(([name, version]) => ({name, version}))

            let newText = []

            const dependencies = loadDependencies('dependencies')
            if(dependencies.length > 0) {
                newText.push('# Production dependencies\n' + dependencies.map(({name, version}) => `${name} ${version}`).join('\n'))
            }

            const devDependencies = loadDependencies('devDependencies')
            if(devDependencies.length > 0) {
                newText.push('# Development dependencies\n' + devDependencies.map(({name, version}) => `${name} ${version}`).join('\n'))
            }

            const optionalDependencies = loadDependencies('optionalDependencies')
            if(optionalDependencies.length > 0) {
                newText.push('# Optional dependencies\n' + optionalDependencies.map(({name, version}) => `${name} ${version}`).join('\n'))
            }

            if(newText.length === 0) setInputError('No dependencies found')
            inputElement.value = newText.join('\n\n')
            onInput()
        } catch(e) {
            setInputError(e.message)
        }
    }

    const onInput = () => {
        const dependencies = inputElement.value.split('\n')
            .filter(l => l.length > 0 && !l.startsWith('#'))
            .map(l => {
                const parts = l.split(' ')
                return {name: parts[0], version: parts[1] ?? '*'}
            })
        props.onDependenciesChange(dependencies)
    }

    return (
        <>
            <div class="flex flex-col space-y-3">
                <label class="text-xl font-semibold" for={inputID}>Libraries</label>

                <textarea id={inputID}
                          onInput={onInput}
                          ref={inputElement}
                          class="textarea textarea-primary border-2 textarea-lg w-96 min-w-min h-48 resize"
                          placeholder="library1\nlibrary2 version\n..."/>

                <label class="btn btn-primary" for={fileInputID}>
                    <TbFileUpload />
                    Load from package.json
                </label>

                <Show when={inputError()}>
                    <div class="alert alert-error">
                        {inputError()}
                    </div>
                </Show>
            </div>
            <input id={fileInputID} ref={fileInputElement} type="file" class="hidden" accept="application/json" onchange={loadFromJson}/>
        </>
    )
}

export default PackageSelectionStage