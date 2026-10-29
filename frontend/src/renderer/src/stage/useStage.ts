import { useStore, STAGES } from '@/state/store'
import { buildInputs, type InputsModel } from './inputs'
import { buildResults, type ResultsModel } from './results'

/** Assembles the current stage's inputs + results models from the store. */
export function useStage(): { inputs: InputsModel; results: ResultsModel } {
  const i = useStore((s) => s.i)
  const g = useStore((s) => s.g)
  const ana = useStore((s) => s.ana)
  const base = useStore((s) => s.base)
  const mon = useStore((s) => s.mon)
  const pre = useStore((s) => s.pre)
  const ins = useStore((s) => s.ins)
  const ndt = useStore((s) => s.ndt)
  const syn = useStore((s) => s.syn)
  const feat = useStore((s) => s.feat)
  const ml = useStore((s) => s.ml)
  const mnt = useStore((s) => s.mnt)
  const rep = useStore((s) => s.rep)
  const tick = useStore((s) => s.tick)
  const jobs = useStore((s) => s.jobs)
  const setG = useStore((s) => s.setG)
  const setAna = useStore((s) => s.setAna)
  const setBase = useStore((s) => s.setBase)
  const setMon = useStore((s) => s.setMon)
  const setK = useStore((s) => s.setK)
  const job = useStore((s) => s.job)
  const train = useStore((s) => s.train)

  const stage = STAGES[i]
  const inputs = buildInputs(stage.id, { g, ana, base, mon, pre, ins, ndt, syn, feat, ml, mnt, rep, setG, setAna, setBase, setMon, setK, job, train })
  const results = buildResults(stage.id, { g, ana, base, mon, pre, ins, ndt, syn, feat, ml, mnt, rep, tick, jobs, job, setBase, setK, staticBig: [...stage.big] })
  return { inputs, results }
}
