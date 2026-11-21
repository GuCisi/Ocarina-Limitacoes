# Nada mal para oito fotos

Short vertical animado (1440x2560, 30 fps, 70,8 s) sobre como as limitações técnicas do Nintendo 64 moldaram a
criação de The Legend of Zelda: Ocarina of Time. Narração em português, personagens 2D em um mundo 3D de desenho
animado, efeitos sonoros e trilha sintetizados.

Feito com [Remotion](https://www.remotion.dev/) + three.js, a partir da skill
[claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) (ver `THIRD_PARTY_NOTICES.md`).

Todo o visual é original: herói genérico, console cinza sem marca, fada em forma de bola de luz. Não há arte,
personagens nem música da Nintendo, e nenhum texto aparece na tela.

## O que há aqui

| Pasta | Conteúdo |
|---|---|
| `shorts/ocarina/SCRIPT.md` | Roteiro aprovado, com os fatos e as fontes |
| `shorts/ocarina/voice/` | Geração da narração (edge-tts) e a narração final (`voice.wav`, `words.json`) |
| `shorts/ocarina/audio/` | Efeitos e música sintetizados em Python; mixagem final em `out/mix.wav` |
| `src/videos/ocarina/` | O filme: núcleo (`timeline.ts`, `story.ts`, `world.ts`, `chars.ts`, `props.ts`) e uma cena por arquivo em `scenes/` |
| `src/videos/ocarina/SPEC.md` | Storyboard técnico: cada fala, com quadros e efeitos sonoros |
| `scripts/` | Quadros de teste, folhas de contato, controle de qualidade |

## Como renderizar

Requisitos: Node 20+, Google Chrome, Python 3.11+ (só para refazer voz e som).

```console
npm install
```

Quadros de teste (meia resolução):

```console
node scripts/stills.mjs out/ocarina/x_ 100,725,2012 0.5
```

Vídeo final em 2K (cerca de 25 minutos num notebook com vídeo integrado):

```console
npx remotion render src/index.ts OcarinaShort out/ocarina/video.mp4 --codec h264 --crf 16 --scale 1.3333333333333333 --gl=angle --concurrency=2
```

O Remotion grava uma faixa de áudio muda; junte a mixagem com o ffmpeg:

```console
ffmpeg -i out/ocarina/video.mp4 -i shorts/ocarina/audio/out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k out/ocarina/final.mp4
```

Para refazer o som: `pip install numpy scipy pillow edge-tts`, depois `python tts.py` e `python tighten.py` em
`shorts/ocarina/voice/` e `python build.py` em `shorts/ocarina/audio/`.

## Observações

- `@react-three/postprocessing` está fixado em 3.0.4: nas versões 3.2.x os quadros do Remotion saem em branco.
- As fusões entre cenas estão desligadas (`XFADE = {}` em `timeline.ts`): um segundo canvas em 2K derruba o contexto
  de vídeo em placas integradas.
- `scripts/stills.mjs` espera o Chrome em `C:/Program Files/Google/Chrome/Application/chrome.exe`; ajuste em outros sistemas.
- O vídeo renderizado não está no repositório (passa de 100 MB).

## Fontes dos fatos

- Iwata Asks, The Legend of Zelda: Ocarina of Time 3D (entrevistas com Shigeru Miyamoto e a equipe original)
- Wikipedia: The Legend of Zelda: Ocarina of Time; Nintendo 64 (especificações técnicas)
- Metacritic: Best Games of All Time (conferido em 2026-11-20)

## Licenças

O código derivado da skill é MIT (ver `THIRD_PARTY_NOTICES.md`). O Remotion tem licença própria: algumas empresas
precisam de licença comercial ([termos](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)).
