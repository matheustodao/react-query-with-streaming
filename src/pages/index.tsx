import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inter } from "next/font/google";

import { useState } from 'react';

const inter = Inter({ subsets: ["latin"] });
const API_URL = 'http://localhost:3004'

function parseNDJSON() {
  let ndjsonBuffer = ''
  return new TransformStream({
    transform(chunk, controller) {
      ndjsonBuffer += chunk
      const items = ndjsonBuffer.split('\n')
      items.slice(0, -1)
        .forEach(item => controller.enqueue(JSON.parse(item)))

      ndjsonBuffer = items[items.length -1]
    },
    flush(controller)  {
      if(!ndjsonBuffer) return;
      controller.enqueue(JSON.parse(ndjsonBuffer))
    }
  })
}

async function consumeAPI(signal: any, counter = () => {}) {
  const response = await fetch(API_URL, { signal })
  // @ts-ignore
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
    // .pipeTo(new WritableStream({
    //   write(chunk) {
    //     counter?.();
    //   }
    // }))

  return reader
}

export default function Home() {
  const [counter, setCounter] = useState(0);
  const queryClient = useQueryClient()

  const { data, refetch,  } = useQuery<any>({
    queryKey: ['animes'],
    queryFn: async ({ signal }) => {
      try {
        const readable = await consumeAPI(signal) as any
        // add signal and await to handle the abortError exception after abortion
        await readable.pipeTo(new WritableStream({
          write(chunk) {
            queryClient.setQueryData(['animes'], (oldData: []) => {
              const update: any[] = [];

              Object.assign(update, [
                ...oldData, chunk
              ])

              const removeDuplicated = update.reduce((acc, current, self) => {
                const exists = acc.findIndex((item: any) => item.title === current.title);

                if (exists === -1) {
                  return [...acc, current]
                }
              }, [])

              return removeDuplicated;
            })
            setCounter((oldCount) => ++oldCount)
          }
        }), { signal: signal })
      } catch (error: any) {
        if (!error.message.includes('abort')) throw error
      }
    },
    enabled: false,
    staleTime: 10 * 1000,
    gcTime: 3 * 1000,
    refetchOnWindowFocus: false,
    initialData: [],
  })

  console.log(data)

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-center gap-2 p-24 ${inter.className}`}
    >
      <div className="sticky bg-black p-8 top-1 rounded-lg flex flex-col items-center justify-center gap-2">
        <div className="flex gap-2">
          <button type="button" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-500 text-white shadow hover:bg-blue-500/90 h-9 px-4 py-2" onClick={() => refetch()}>
            Iniciar
          </button>

          <button type="button" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-orange-500 text-white shadow hover:bg-orange-500/90 h-9 px-4 py-2" onClick={() => {
            queryClient.cancelQueries({
              queryKey: ['animes'],
            });
            console.log('Aborting...')
          }}>
            Pausar
          </button>

          <button type="button" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-500 text-white shadow hover:bg-red-500/90 h-9 px-4 py-2" onClick={() => {
            queryClient.resetQueries({
              queryKey: ['animes'],
            });
            queryClient.clear();
            queryClient.invalidateQueries({
              queryKey: ['animes']
            })
            setCounter(0)
            console.log('Aborting...')
          }}>
            Resetar
          </button>
        </div>

        <span className="mt-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-green-500/50 text-white shadow h-9 px-4 py-2">
          Retrieve: {counter} times
        </span>

        <span className="mt-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-pink-500/50 text-white shadow h-9 px-4 py-2">
          {data?.length} times
        </span>
      </div>

      <ul>
        {Array.isArray(data) && data?.map(({ title, description, url_anime }, index) => (
          <li className="mt-10" key={`${title}-${index}`}>
            <div className="rounded-xl bg-slate-900 text-slate-900-foreground">
              <div className="flex-col p-6 items-start gap-4 space-y-0">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold mb-3">
                    {title}
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>

                <a href={url_anime} className="flex items-center space-x-1 rounded-md bg-secondary text-secondary-foreground" target="_blank">
                  <div className="flex items-center text-xs mt-3">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1 h-3 w-3 fill-sky-400 text-sky-400"><path d="M0.877075 7.49991C0.877075 3.84222 3.84222 0.877075 7.49991 0.877075C11.1576 0.877075 14.1227 3.84222 14.1227 7.49991C14.1227 11.1576 11.1576 14.1227 7.49991 14.1227C3.84222 14.1227 0.877075 11.1576 0.877075 7.49991ZM7.49991 1.82708C4.36689 1.82708 1.82708 4.36689 1.82708 7.49991C1.82708 10.6329 4.36689 13.1727 7.49991 13.1727C10.6329 13.1727 13.1727 10.6329 13.1727 7.49991C13.1727 4.36689 10.6329 1.82708 7.49991 1.82708Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
                    Ver Mais
                </div>
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
