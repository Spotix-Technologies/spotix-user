import type { ContestantData, CategoryData, PollStatus } from "@/app/lib/voting-utils"
import { CategoryPanel } from "./CategoryPanel"

interface GroupPollSectionProps {
  categories: CategoryData[]
  isActive: boolean
  pollStatus: PollStatus
  statsVisible: boolean
  pollName: string
  onVote: (contestant: ContestantData, cat: CategoryData) => void
  onFullscreen: (contestant: ContestantData) => void
}

export function GroupPollSection({
  categories, isActive, pollStatus, statsVisible, pollName, onVote, onFullscreen,
}: GroupPollSectionProps) {
  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
          {pollStatus === "ended" ? "Final Results" : "Award Categories"}
        </h2>
        <p className="text-slate-600">
          {isActive
            ? "Open a category and vote for your favourite contestant"
            : pollStatus === "notStarted"
            ? "Categories will be available once voting starts"
            : "Voting has ended — see the final results below"}
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300">
          <p className="text-slate-500 font-medium">No categories added yet</p>
        </div>
      ) : (
        categories.map((cat) => (
          <CategoryPanel
            key={cat.categoryId}
            category={cat}
            depth={0}
            isActive={isActive}
            pollStatus={pollStatus}
            statsVisible={statsVisible}
            pollName={pollName}
            onVote={onVote}
            onFullscreen={onFullscreen}
          />
        ))
      )}
    </div>
  )
}
