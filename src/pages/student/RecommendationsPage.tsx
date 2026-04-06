import React, { useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BookCard from '@/components/shared/BookCard';
import { useLibrary } from '@/contexts/LibraryContext';

// Questionário simples que recomenda livros com base no perfil de leitura.
const categoryMap: Record<string, string[]> = {
  aventura: ['Aventura'],
  romance: ['Romance Brasileiro'],
  fantasia: ['Literatura Infantil', 'Ficção Científica'],
  reflexão: ['Biografia', 'Romance Brasileiro'],
  política: ['Ficção Política'],
};

const paceBonus = (days: number, answer: string) => {
  if (answer === 'Rápido e empolgante') {
    return days <= 14 ? 4 : 0;
  }
  if (answer === 'Calmo e profundo') {
    return days >= 18 ? 4 : 1;
  }
  return days <= 18 ? 3 : 1;
};

const RecommendationsPage: React.FC = () => {
  const { books } = useLibrary();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const questions = [
    {
      key: 'categoria',
      label: 'Que tipo de leitura combina com você hoje?',
      options: ['Aventura', 'Romance', 'Fantasia', 'Reflexão', 'Política'],
    },
    {
      key: 'humor',
      label: 'Como você quer se sentir ao ler?',
      options: ['Animado(a)', 'Curioso(a)', 'Inspirado(a)', 'Tranquilo(a)'],
    },
    {
      key: 'ritmo',
      label: 'Qual ritmo de leitura você prefere?',
      options: ['Rápido e empolgante', 'Calmo e profundo', 'Leve e divertido'],
    },
    {
      key: 'objetivo',
      label: 'O que você busca com essa leitura?',
      options: ['Diversão', 'Aprendizado', 'Trabalho escolar', 'Reflexão pessoal'],
    },
  ];

  const recommended = !showResults
    ? []
    : [...books]
        .map((book) => {
          const selectedCategories = categoryMap[answers.categoria?.toLowerCase() || ''] || [];
          let score = book.classificacao * 2 + book.quantidadeDisponivel;

          if (selectedCategories.includes(book.categoria)) {
            score += 6;
          }

          if (
            answers.objetivo === 'Trabalho escolar' &&
            ['Biografia', 'Romance Brasileiro', 'Ficção Política'].includes(book.categoria)
          ) {
            score += 3;
          }

          if (
            answers.objetivo === 'Diversão' &&
            ['Aventura', 'Literatura Infantil', 'Ficção Científica'].includes(book.categoria)
          ) {
            score += 3;
          }

          score += paceBonus(book.diasLeitura, answers.ritmo || '');
          return { book, score };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map((entry) => entry.book);

  const handleAnswer = (value: string) => {
    const nextAnswers = { ...answers, [questions[step].key]: value };
    setAnswers(nextAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }

    setShowResults(true);
  };

  if (showResults) {
    return (
      <div className="max-w-5xl space-y-5 sm:space-y-6">
        <div className="glass-panel rounded-[1.6rem] p-5 sm:rounded-[1.8rem] sm:p-6">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warm-gold" />
            <h1 className="font-display text-2xl text-foreground sm:text-3xl">Recomendações para você</h1>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            Selecionamos leituras com base nas suas respostas, no ritmo desejado e no acervo disponível da biblioteca.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.values(answers).map((answer) => (
              <span
                key={answer}
                className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground"
              >
                {answer}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recommended.map((book) => (
            <BookCard key={book.id} book={book} onClick={() => navigate(`/aluno/catalogo/${book.id}`)} />
          ))}
        </div>

        <button
          onClick={() => {
            setStep(0);
            setAnswers({});
            setShowResults(false);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-primary transition-colors hover:border-primary/30 hover:bg-primary/5 sm:w-auto"
        >
          <RotateCcw className="h-4 w-4" />
          Refazer questionário
        </button>
      </div>
    );
  }

  const question = questions[step];

  return (
    <div className="max-w-4xl space-y-5 sm:space-y-6">
      <div className="glass-panel rounded-[1.6rem] p-5 sm:rounded-[1.9rem] sm:p-6">
        <p className="section-kicker">Trilha personalizada</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Recomendações de leitura</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Responda algumas perguntas e receba sugestões alinhadas ao seu momento, à sua curiosidade e ao ritmo de
          leitura que você quer seguir.
        </p>
      </div>

      <div className="glass-panel panel-sheen rounded-[1.6rem] p-5 shadow-card sm:rounded-[1.9rem] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-muted-foreground">Pergunta {step + 1} de {questions.length}</span>
          <span className="w-fit rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            Etapa {Math.round(((step + 1) / questions.length) * 100)}%
          </span>
        </div>

        <div className="my-5 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-gradient-gold transition-all"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h2 className="mb-5 font-display text-2xl text-foreground sm:text-[2rem]">{question.label}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              className="group interactive-panel w-full rounded-[1.4rem] border border-border/70 bg-card/70 px-4 py-4 text-left text-sm text-foreground transition-colors hover:border-warm-gold/30 hover:bg-card"
            >
              <span className="font-medium">{option}</span>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Escolha esta opção para seguir com recomendações mais próximas do seu perfil.
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
