import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'

const app = express()
const port = 3001

app.use(cors())
app.use(bodyParser.json())

const allItems = Array.from({ length: 1000 }, (_, i) => ({
	id: i + 1,
	label: `Item ${i + 1}`,
}))
let selectedItems = new Set()
let sortedItems = allItems.map(item => item.id)

app.get('/items', (req, res) => {
	const { offset = 0, limit = 1000 } = req.query

	const sorted = sortedItems
		.map(id => allItems.find(i => i?.id === id))
		.filter(Boolean)

	res.json({
		items: sorted.slice(Number(offset), Number(offset) + Number(limit)),
		total: sorted.length,
	})
})

app.post('/select', (req, res) => {
	const { ids } = req.body
	ids.forEach(id => selectedItems.add(id))
	res.sendStatus(200)
})

app.post('/prioritize', (req, res) => {
	const { search } = req.body
	const target = allItems.find(i => i.label === `Item ${search}`)
	if (!target) {
		return res.sendStatus(204)
	}

	sortedItems = sortedItems.filter(id => id !== target.id)
	sortedItems.unshift(target.id)

	res.sendStatus(200)
})

app.post('/deselect', (req, res) => {
	const { ids } = req.body
	ids.forEach(id => selectedItems.delete(id))
	res.sendStatus(200)
})

app.get('/selected', (req, res) => {
	res.json(Array.from(selectedItems))
})

app.post('/sort', (req, res) => {
	const { ids } = req.body
	sortedItems = ids
	res.sendStatus(200)
})

app.listen(port, () =>
	console.log(`Server listening at http://localhost:${port}`)
)
