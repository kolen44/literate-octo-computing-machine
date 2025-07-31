import { closestCenter, DndContext } from '@dnd-kit/core'
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import axios from 'axios'
import React, { useEffect, useRef, useState } from 'react'

import './App.css'

const PAGE_SIZE = 20

function SortableItem({ item, isSelected, toggleSelect }) {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: item.id })
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		backgroundColor: isSelected ? '#d0f0d0' : '#fff',
		padding: '4px',
		border: '1px solid #ccc',
		margin: '4px 0',
		cursor: 'grab',
	}

	return (
		<li ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<input
				type='checkbox'
				checked={isSelected}
				onChange={() => toggleSelect(item.id)}
			/>
			{item.label}
		</li>
	)
}

function App() {
	const [items, setItems] = useState([])
	const [offset, setOffset] = useState(0)
	const [hasMore, setHasMore] = useState(true)
	const [searchInput, setSearchInput] = useState('')
	const [searchQuery, setSearchQuery] = useState('')
	const [selected, setSelected] = useState(new Set())
	const loader = useRef(null)
	const [noResults, setNoResults] = useState(false)

	// Базовый URL для API — текущий домен с заменой порта на 3001
	const API_BASE_URL = window.location.origin.replace(/:\d+$/, ':3001')

	useEffect(() => {
		loadItems(true)
	}, [searchQuery])

	const loadItems = async (reset = false) => {
		const res = await axios.get(`${API_BASE_URL}/items`, {
			params: {
				offset: reset ? 0 : offset,
				limit: PAGE_SIZE,
				search: searchQuery,
			},
		})
		const newItems = res.data.items
		console.log(newItems)

		if (reset) {
			setItems(newItems)
			setOffset(PAGE_SIZE)
			setNoResults(newItems.length === 0)
		} else {
			setItems(prev => [...prev, ...newItems])
			setOffset(prev => prev + PAGE_SIZE)
		}
		setHasMore(newItems.length === PAGE_SIZE)
	}

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && hasMore) loadItems()
			},
			{ threshold: 1 }
		)
		if (loader.current) observer.observe(loader.current)
		return () => loader.current && observer.unobserve(loader.current)
	}, [hasMore, offset, searchQuery])

	const toggleSelect = async id => {
		const updated = new Set(selected)
		if (updated.has(id)) {
			updated.delete(id)
			await axios.post(`${API_BASE_URL}/deselect`, { ids: [id] })
		} else {
			updated.add(id)
			await axios.post(`${API_BASE_URL}/select`, { ids: [id] })
		}
		setSelected(updated)
	}

	const handleDragEnd = async event => {
		const { active, over } = event
		if (active.id !== over?.id) {
			const oldIndex = items.findIndex(i => i.id === active.id)
			const newIndex = items.findIndex(i => i.id === over?.id)
			const newItems = arrayMove(items, oldIndex, newIndex)
			setItems(newItems)
			await axios.post(`${API_BASE_URL}/sort`, {
				ids: newItems.map(i => i.id),
			})
		}
	}

	const handleSearchClick = async () => {
		if (searchInput.trim() === '') return

		await axios.post(`${API_BASE_URL}/prioritize`, {
			search: searchInput.trim(),
		})

		setSearchQuery(searchInput)
		setOffset(0)
		setHasMore(true)
	}

	return (
		<div className='App'>
			<div style={{ marginBottom: 12 }}>
				<input
					type='text'
					placeholder='Поиск...'
					value={searchInput}
					onChange={e => setSearchInput(e.target.value)}
					style={{ padding: '8px', width: '300px' }}
				/>
				<button
					onClick={handleSearchClick}
					style={{ padding: '8px 12px', marginLeft: 8 }}
				>
					Поиск
				</button>
			</div>

			{noResults ? (
				<p>Ничего не найдено.</p>
			) : (
				<DndContext
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={items.map(i => i.id)}
						strategy={verticalListSortingStrategy}
					>
						<ul style={{ listStyle: 'none', padding: 0 }}>
							{items.map((item, index) => (
								<SortableItem
									key={index}
									item={item}
									isSelected={selected.has(item.id)}
									toggleSelect={toggleSelect}
								/>
							))}
						</ul>
					</SortableContext>
				</DndContext>
			)}

			<div ref={loader} style={{ height: 40 }}></div>
		</div>
	)
}

export default App
