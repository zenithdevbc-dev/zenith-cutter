import { Skeleton } from "@/components/ui/skeleton"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"

interface TableSkeletonRowsProps {
  rows?: number
  columns: number
}

/** Linhas de carregamento pra usar no lugar de <TableBody> enquanto os dados chegam. */
function TableSkeletonRows({ rows = 5, columns }: TableSkeletonRowsProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, linha) => (
        <TableRow key={linha}>
          {Array.from({ length: columns }).map((_, coluna) => (
            <TableCell key={coluna}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

export { TableSkeletonRows }
