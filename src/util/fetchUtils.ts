
// Borrowed concept and code from https://javascript.info/fetch-progress

export async function fetchWithProgress(fetchArgs: Parameters<typeof fetch>, progressCallback: (current: number, goal: number) => void): Promise<Uint8Array> {
    const response = await fetch(...fetchArgs)

    if(!response.body) {
        throw new Error('Response body was null!')
    }

    const reader = response.body.getReader()
    const contentLength = Number(response.headers.get('Content-Length'))

    let receivedLength = 0
    let chunks: Uint8Array[] = []
    while(true) {
        const {done, value} = await reader.read()
        if(done) break

        chunks.push(value)
        receivedLength += value.length
        progressCallback(receivedLength, contentLength)
    }

    const combinedChunks = new Uint8Array(receivedLength)
    let position = 0
    for(const chunk of chunks) {
        combinedChunks.set(chunk, position)
        position += chunk.length
    }

    return combinedChunks
}