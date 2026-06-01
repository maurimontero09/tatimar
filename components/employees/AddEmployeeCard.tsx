'use client'

import { NewEmployeeModal } from './NewEmployeeModal'

export function AddEmployeeCard() {
  return (
    <NewEmployeeModal trigger={
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4
                      flex flex-col items-center justify-center gap-2 cursor-pointer
                      hover:border-[var(--blue)] hover:bg-blue-50/30 transition-all min-h-[200px]">
        <div className="text-3xl text-gray-300">+</div>
        <div className="text-sm text-gray-400">Add new employee</div>
      </div>
    } />
  )
}
