import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCollection,
  deleteCollection,
  getShopProfile,
  renameCollection,
  reorderCollections,
} from "../services/shopService";

function sortCollections(collections) {
  return [...collections].sort((a, b) => a.displayOrder - b.displayOrder);
}

function moveCollection(collections, draggedId, targetId) {
  if (!draggedId || draggedId === targetId) {
    return collections;
  }

  const nextCollections = [...collections];
  const fromIndex = nextCollections.findIndex((collection) => collection.id === draggedId);
  const toIndex = nextCollections.findIndex((collection) => collection.id === targetId);

  if (fromIndex < 0 || toIndex < 0) {
    return collections;
  }

  const [draggedCollection] = nextCollections.splice(fromIndex, 1);
  nextCollections.splice(toIndex, 0, draggedCollection);

  return nextCollections.map((collection, index) => ({
    ...collection,
    displayOrder: index,
  }));
}

export default function CollectionManager() {
  const { shopId } = useParams();
  const [shopName, setShopName] = useState("");
  const [collections, setCollections] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCollections() {
      try {
        const profile = await getShopProfile(shopId);

        if (active) {
          setShopName(profile.name || "");
          setCollections(sortCollections(profile.collections || []));
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Nao foi possivel carregar as colecoes");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCollections();

    return () => {
      active = false;
    };
  }, [shopId]);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");

    const name = newCollectionName.trim();
    if (!name) {
      setError("Preenche o nome da colecao");
      return;
    }

    try {
      setIsSubmitting(true);
      const createdCollection = await createCollection(shopId, name);
      setCollections((currentCollections) =>
        sortCollections([...currentCollections, createdCollection])
      );
      setNewCollectionName("");
    } catch (createError) {
      setError(createError.message || "Nao foi possivel criar a colecao");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startRename(collection) {
    setEditingId(collection.id);
    setEditingName(collection.name);
  }

  async function handleRename(event) {
    event.preventDefault();
    setError("");

    const name = editingName.trim();
    if (!name) {
      setError("Preenche o nome da colecao");
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedCollection = await renameCollection(shopId, editingId, name);
      setCollections((currentCollections) =>
        sortCollections(
          currentCollections.map((collection) =>
            collection.id === updatedCollection.id ? updatedCollection : collection
          )
        )
      );
      setEditingId(null);
      setEditingName("");
    } catch (renameError) {
      setError(renameError.message || "Nao foi possivel renomear a colecao");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!collectionToDelete) {
      return;
    }

    try {
      setIsSubmitting(true);
      await deleteCollection(shopId, collectionToDelete.id);
      setCollections((currentCollections) =>
        currentCollections.filter((collection) => collection.id !== collectionToDelete.id)
      );
      setCollectionToDelete(null);
      setError("");
    } catch (deleteError) {
      setError(deleteError.message || "Nao foi possivel apagar a colecao");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDrop(targetId) {
    const nextCollections = moveCollection(collections, draggedId, targetId);
    setDraggedId(null);

    if (nextCollections === collections) {
      return;
    }

    setCollections(nextCollections);

    try {
      const reorderedCollections = await reorderCollections(
        shopId,
        nextCollections.map((collection) => collection.id)
      );
      setCollections(sortCollections(reorderedCollections));
    } catch (reorderError) {
      setError(reorderError.message || "Nao foi possivel reordenar as colecoes");
    }
  }

  return (
    <div style={{ maxWidth: "40rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      <h1>Gerir colecoes</h1>
      {shopName && <p>Loja: {shopName}</p>}

      {isLoading && <p>A carregar colecoes...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!isLoading && (
        <>
          <form onSubmit={handleCreate}>
            <input
              type="text"
              name="collectionName"
              placeholder="Nome da colecao"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
            />
            <button type="submit" disabled={isSubmitting}>
              Criar
            </button>
          </form>

          <ul>
            {collections.map((collection) => (
              <li
                key={collection.id}
                draggable
                onDragStart={() => setDraggedId(collection.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(collection.id)}
              >
                {editingId === collection.id ? (
                  <form onSubmit={handleRename}>
                    <input
                      type="text"
                      name="renameCollection"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <button type="submit" disabled={isSubmitting}>
                      Guardar
                    </button>
                  </form>
                ) : (
                  <>
                    <span>{collection.name}</span>
                    <button type="button" onClick={() => startRename(collection)}>
                      Renomear
                    </button>
                    <button type="button" onClick={() => setCollectionToDelete(collection)}>
                      Apagar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {collectionToDelete && (
        <div role="dialog" aria-modal="true" aria-label="Confirmar apagar colecao">
          <p>Apagar a colecao {collectionToDelete.name}?</p>
          <button type="button" onClick={confirmDelete} disabled={isSubmitting}>
            Confirmar
          </button>
          <button type="button" onClick={() => setCollectionToDelete(null)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
