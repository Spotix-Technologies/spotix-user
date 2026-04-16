import "jspdf"

declare module "jspdf" {
  interface jsPDF {
    setLineDash(dashArray: number[], dashPhase?: number): jsPDF
  }
}