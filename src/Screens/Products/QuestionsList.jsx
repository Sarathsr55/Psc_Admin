import { createOutline, trashOutline } from 'ionicons/icons'
import { getAllQuestions } from '../../services/products'
import { useQuery } from '@tanstack/react-query'
import { IonIcon } from '@ionic/react'
import QuestionDisplay from './QuestionDisplay'

const QuestionsList = ({ onEdit, onDelete }) => {
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["questions"],
    queryFn: getAllQuestions,
    refetchInterval: 5000,
  })

  if (isLoading) return <p>Loading...</p>
  if (isError) return <p>Error: {error.message}</p>

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '55%',
        maxHeight: '89vh',
        overflowY: data.length > 0 ? 'auto' : 'hidden',
        overflowX: 'hidden'
      }}
    >
      {data.length > 0 ? (
        [...data].reverse().map((obj) => (
          <div key={obj._id} className="questionsection">
            <div className="edit">
              <IonIcon icon={createOutline} onClick={() => onEdit(obj)} />
              <IonIcon icon={trashOutline} onClick={() => onDelete(obj)} />
            </div>
            <QuestionDisplay data={obj} />
          </div>
        ))
      ) : (
        <p className="no-data">No question available</p>
      )}
    </div>
  )
}

export default QuestionsList
