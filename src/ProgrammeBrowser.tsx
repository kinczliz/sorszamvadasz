import programs from './programs'

type ProgrammeBrowserProps = {
  displayName: string
}

function groupProgramsByDay() {
  return programs.reduce<Map<string, typeof programs>>((groups, program) => {
    const dayPrograms = groups.get(program.day) ?? []
    dayPrograms.push(program)
    groups.set(program.day, dayPrograms)

    return groups
  }, new Map())
}

function ProgrammeBrowser({ displayName }: ProgrammeBrowserProps) {
  const programsByDay = groupProgramsByDay()

  return (
    <main className="programme-browser" aria-labelledby="app-title">
      <header className="programme-header">
        <p className="festival-name">Ördögkatlan</p>
        <h1 id="app-title">Sorszámvadász</h1>
        <p className="eyebrow">Szia, {displayName}!</p>
      </header>

      <section aria-labelledby="programme-title">
        <h2 id="programme-title">Programok</h2>

        {[...programsByDay].map(([day, dayPrograms]) => (
          <section className="programme-day" key={day} aria-labelledby={`day-${day}`}>
            <h3 id={`day-${day}`}>{day}</h3>
            <div className="programme-list">
              {dayPrograms.map((program) => (
                <article className="programme-card" key={program.id}>
                  <time dateTime={program.startTime}>{program.startTime}</time>
                  <div>
                    <h4>{program.title}</h4>
                    <p>{program.type}</p>
                    <p>{program.location}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  )
}

export default ProgrammeBrowser
