import { useStore, STAGES } from '@/state/store'
import { buildInputs, type InputsModel } from './inputs'
import { buildResults, type ResultsModel } from './results'
import { useVerify } from '@/api/verify'

/** Assembles the current stage's inputs + results models from the store, then
 *  reconciles the headline values against the backend (preview → verified). */
export function useStage(): { inputs: InputsModel; results: ResultsModel; verifying: boolean } {
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
  const mlReal = useStore((s) => s.mlReal)
  const dataset = useStore((s) => s.dataset)
  const seen = useStore((s) => s.seen)
  const lastSeen = useStore((s) => s.lastSeen)
  const setG = useStore((s) => s.setG)
  const setAna = useStore((s) => s.setAna)
  const setBase = useStore((s) => s.setBase)
  const setMon = useStore((s) => s.setMon)
  const setK = useStore((s) => s.setK)
  const job = useStore((s) => s.job)
  const bump = useStore((s) => s.bump)
  const train = useStore((s) => s.train)
  const genDataset = useStore((s) => s.genDataset)
  const exportJSON = useStore((s) => s.exportJSON)

  const verify = useVerify(STAGES[i].id, g, base, ana, pre, mon, syn, feat, ml)

  const stage = STAGES[i]
  const inputs = buildInputs(stage.id, { g, ana, base, mon, pre, ins, ndt, syn, feat, ml, mnt, rep, setG, setAna, setBase, setMon, setK, job, bump, train, genDataset, exportJSON })
  const local = buildResults(stage.id, { g, ana, base, mon, pre, ins, ndt, syn, feat, ml, mnt, rep, tick, jobs, job, bump, setBase, setK, mlReal, dataset, seen, lastSeen, staticBig: [...stage.big] })
  // Preview → verified: overlay the backend-verified fields onto the local model.
  const results = verify.patch ? ({ ...local, ...verify.patch } as ResultsModel) : local
  return { inputs, results, verifying: verify.verifying }
}
