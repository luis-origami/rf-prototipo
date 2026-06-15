import { NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export async function GET() {
  try {
    const resposta = await fetch(`${API_URL}/schema/tabelas`)

    if (!resposta.ok) {
      return NextResponse.json(
        { erro: 'API retornou erro', detalhe: await resposta.text() },
        { status: resposta.status }
      )
    }

    const dados = await resposta.json()
    return NextResponse.json(dados)
  } catch (erro) {
    return NextResponse.json(
      { erro: 'Não foi possível conectar à API', detalhe: String(erro) },
      { status: 500 }
    )
  }
}
