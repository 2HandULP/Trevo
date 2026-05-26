import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
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

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
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
  const [dropTargetId, setDropTargetId] = useState(null);
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
          setError(
            getErrorMessage(
              loadError,
              "Não foi possível carregar as coleções"
            )
          );
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
      setError("Preenche o nome da coleção");
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
      setError(
        getErrorMessage(createError, "Não foi possível criar a coleção")
      );
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
      setError("Preenche o nome da coleção");
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
      setError(
        getErrorMessage(renameError, "Não foi possível renomear a coleção")
      );
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
      setError(
        getErrorMessage(deleteError, "Não foi possível apagar a coleção")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDrop(targetId) {
    const nextCollections = moveCollection(collections, draggedId, targetId);
    setDraggedId(null);
    setDropTargetId(null);

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
      setError(
        getErrorMessage(
          reorderError,
          "Não foi possível reordenar as coleções"
        )
      );
    }
  }

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow={shopName ? `Loja: ${shopName}` : "Loja"}
        title="Gerir coleções"
        description="Organiza colecoes, renomeia grupos e ajusta a ordem apresentada aos compradores."
      />

      {isLoading && <div className="h-72 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {!isLoading && (
        <section className="page-card mx-auto max-w-3xl p-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="collectionName"
              placeholder="Nome da coleção"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              className="form-input min-w-0 flex-1"
            />
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              Criar
            </button>
          </form>

          {collections.length === 0 && (
            <div className="surface-panel mt-6 p-6 text-center text-[var(--color-muted)]">
              Esta loja ainda não tem coleções.
            </div>
          )}

          <ul className="mt-6 space-y-3">
            {collections.map((collection) => (
              <li
                key={collection.id}
                draggable
                onDragStart={() => setDraggedId(collection.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDropTargetId(null);
                }}
                onDragEnter={() => setDropTargetId(collection.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(collection.id)}
                className={`rounded-lg border p-4 transition ${
                  draggedId === collection.id
                    ? "border-gray-400 bg-gray-100 opacity-60"
                    : dropTargetId === collection.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-black/10 bg-white shadow-[var(--shadow-card)]"
                }`}
              >
                {editingId === collection.id ? (
                  <form onSubmit={handleRename} className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      name="renameCollection"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="form-input min-w-0 flex-1"
                    />
                    <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                      Guardar
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="font-black">{collection.name}</span>
                    <button
                      type="button"
                      onClick={() => startRename(collection)}
                      className="btn btn-secondary ml-auto min-h-10 px-3 py-1"
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionToDelete(collection)}
                      className="btn min-h-10 border border-red-200 bg-red-50 px-3 py-1 text-red-700"
                    >
                      Apagar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-collection-title"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 id="delete-collection-title" className="text-xl font-black">
              Confirmar apagar coleção
            </h2>
            <p className="mt-3">Apagar a coleção {collectionToDelete.name}?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCollectionToDelete(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="btn bg-red-600 text-white disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
