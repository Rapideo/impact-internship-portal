export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        {message}
      </td>
    </tr>
  );
}
