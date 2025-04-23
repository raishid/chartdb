import React, {
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { useChartDB } from '@/hooks/use-chartdb';
import { useDialog } from '@/hooks/use-dialog';
import { Toaster } from '@/components/toast/toaster';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLayout } from '@/hooks/use-layout';
import { useToast } from '@/components/toast/use-toast';
import { ToastAction } from '@/components/toast/toast';
import { useLocalConfig } from '@/hooks/use-local-config';
import { useTranslation } from 'react-i18next';
import { FullScreenLoaderProvider } from '@/context/full-screen-spinner-context/full-screen-spinner-provider';
import { LayoutProvider } from '@/context/layout-context/layout-provider';
import { LocalConfigProvider } from '@/context/local-config-context/local-config-provider';
import { StorageProvider } from '@/context/storage-context/storage-provider';
import { ConfigProvider } from '@/context/config-context/config-provider';
import { RedoUndoStackProvider } from '@/context/history-context/redo-undo-stack-provider';
import { ChartDBProvider } from '@/context/chartdb-context/chartdb-provider';
import { HistoryProvider } from '@/context/history-context/history-provider';
import { ThemeProvider } from '@/context/theme-context/theme-provider';
import { ReactFlowProvider } from '@xyflow/react';
import { ExportImageProvider } from '@/context/export-image-context/export-image-provider';
import { DialogProvider } from '@/context/dialog-context/dialog-provider';
import { KeyboardShortcutsProvider } from '@/context/keyboard-shortcuts-context/keyboard-shortcuts-provider';
import { Spinner } from '@/components/spinner/spinner';
import { Helmet } from 'react-helmet-async';
import { AlertProvider } from '@/context/alert-context/alert-provider';
import { CanvasProvider } from '@/context/canvas-context/canvas-provider';
import { HIDE_BUCKLE_DOT_DEV } from '@/lib/env';
import { DiffProvider } from '@/context/diff-context/diff-provider';
import { TopNavbarMock } from './top-navbar/top-navbar-mock';
import { useGraoLoader } from './use-grao-loader';
import { importDBMLToDiagram } from '@/lib/dbml-import';

const OPEN_STAR_US_AFTER_SECONDS = 30;
const SHOW_STAR_US_AGAIN_AFTER_DAYS = 1;

export const EditorDesktopLayoutLazy = React.lazy(
    () => import('./editor-desktop-layout')
);

export const EditorMobileLayoutLazy = React.lazy(
    () => import('./editor-mobile-layout')
);

const EditorPageComponent: React.FC = () => {
    const { diagramName, currentDiagram, schemas, filteredSchemas } =
        useChartDB();
    const { openSelectSchema, showSidePanel } = useLayout();
    const { openStarUsDialog } = useDialog();
    const { diagramId } = useParams<{ diagramId: string }>();
    const { isMd: isDesktop } = useBreakpoint('md');
    const {
        hideMultiSchemaNotification,
        setHideMultiSchemaNotification,
        starUsDialogLastOpen,
        setStarUsDialogLastOpen,
        githubRepoOpened,
    } = useLocalConfig();
    const { toast } = useToast();
    const { t } = useTranslation();
    const { initialDiagram } = useGraoLoader();

    useEffect(() => {
        if (HIDE_BUCKLE_DOT_DEV) {
            return;
        }

        if (!currentDiagram?.id || githubRepoOpened) {
            return;
        }

        if (
            new Date().getTime() - starUsDialogLastOpen >
            1000 * 60 * 60 * 24 * SHOW_STAR_US_AGAIN_AFTER_DAYS
        ) {
            const lastOpen = new Date().getTime();
            setStarUsDialogLastOpen(lastOpen);
            setTimeout(openStarUsDialog, OPEN_STAR_US_AFTER_SECONDS * 1000);
        }
    }, [
        currentDiagram?.id,
        githubRepoOpened,
        openStarUsDialog,
        setStarUsDialogLastOpen,
        starUsDialogLastOpen,
    ]);

    const lastDiagramId = useRef<string>('');

    const handleChangeSchema = useCallback(async () => {
        showSidePanel();
        if (!isDesktop) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        openSelectSchema();
    }, [openSelectSchema, showSidePanel, isDesktop]);

    const dbmlContent = `// Use DBML to define your database structure
      // Simple Blog System with Comments Example
      
      Table security.users {
        id primary [primary key]
        name text
        email email
        address textarea
      }
      
      Table posts {
        id integer [primary key]
        title varchar
        content text
        user_id integer
        created_at timestamp
      }
      
      Table comments {
        id integer [primary key]
        content text
        post_id integer
        user_id integer
        created_at timestamp
      }
      
      // Relationships
      Ref: posts.user_id > security.users.id // Each post belongs to one user
      Ref: comments.post_id > posts.id // Each comment belongs to one post
      Ref: comments.user_id > security.users.id // Each comment is written by one user`;

    const {
        addTables,
        addRelationships,
        tables,
        relationships,
        removeTables,
        removeRelationships,
    } = useChartDB();
    const [, setReorder] = useState(false);

    const handleImport = useCallback(async () => {
        if (!dbmlContent.trim()) return;

        try {
            const importedDiagram = await importDBMLToDiagram(dbmlContent);
            console.log(importedDiagram);
            const tableIdsToRemove = tables
                // .filter((table) =>
                //     importedDiagram.tables?.some(
                //         (t) =>
                //             t.name === table.name && t.schema === table.schema
                //     )
                // )
                .map((table) => table.id);
            // Find relationships that need to be removed
            const relationshipIdsToRemove = relationships
                // .filter((relationship) => {
                //     const sourceTable = tables.find(
                //         (table) => table.id === relationship.sourceTableId
                //     );
                //     const targetTable = tables.find(
                //         (table) => table.id === relationship.targetTableId
                //     );
                //     if (!sourceTable || !targetTable) return true;
                //     const replacementSourceTable = importedDiagram.tables?.find(
                //         (table) =>
                //             table.name === sourceTable.name &&
                //             table.schema === sourceTable.schema
                //     );
                //     const replacementTargetTable = importedDiagram.tables?.find(
                //         (table) =>
                //             table.name === targetTable.name &&
                //             table.schema === targetTable.schema
                //     );
                //     return replacementSourceTable || replacementTargetTable;
                // })
                .map((relationship) => relationship.id);

            // Remove existing items
            await Promise.all([
                removeTables(tableIdsToRemove, { updateHistory: false }),
                removeRelationships(relationshipIdsToRemove, {
                    updateHistory: false,
                }),
            ]);

            // Add new items
            await Promise.all([
                addTables(importedDiagram.tables ?? [], {
                    updateHistory: false,
                }),
                addRelationships(importedDiagram.relationships ?? [], {
                    updateHistory: false,
                }),
            ]);
            setReorder(true);
        } catch (e) {
            console.error(e);
        }
    }, [
        addRelationships,
        addTables,
        dbmlContent,
        relationships,
        removeRelationships,
        removeTables,
        tables,
    ]);

    useEffect(() => {
        if (lastDiagramId.current === currentDiagram.id) {
            return;
        }

        handleImport();

        lastDiagramId.current = currentDiagram.id;
        if (schemas.length > 1 && !hideMultiSchemaNotification) {
            const formattedSchemas = !filteredSchemas
                ? t('multiple_schemas_alert.none')
                : filteredSchemas
                      .map((filteredSchema) =>
                          schemas.find((schema) => schema.id === filteredSchema)
                      )
                      .map((schema) => `'${schema?.name}'`)
                      .join(', ');
            toast({
                duration: 5500,
                title: t('multiple_schemas_alert.title'),
                description: t('multiple_schemas_alert.description', {
                    schemasCount: schemas.length,
                    formattedSchemas,
                }),
                variant: 'default',
                layout: 'column',
                className:
                    'top-0 right-0 flex fixed md:max-w-[420px] md:top-4 md:right-4',
                action: (
                    <div className="flex justify-between gap-1">
                        <ToastAction
                            altText="Don't show this notification again"
                            className="flex-nowrap"
                            onClick={() => setHideMultiSchemaNotification(true)}
                        >
                            {t('multiple_schemas_alert.dont_show_again')}
                        </ToastAction>
                        <ToastAction
                            onClick={() => handleChangeSchema()}
                            altText="Change the schema"
                            className="border border-pink-600 bg-pink-600 text-white hover:bg-pink-500"
                        >
                            {t('multiple_schemas_alert.change_schema')}
                        </ToastAction>
                    </div>
                ),
            });
        }
    }, [
        schemas,
        filteredSchemas,
        toast,
        currentDiagram.id,
        diagramId,
        openSelectSchema,
        t,
        handleChangeSchema,
        hideMultiSchemaNotification,
        setHideMultiSchemaNotification,
        handleImport,
    ]);

    return (
        <>
            <Helmet>
                <title>
                    {diagramName
                        ? `ChartDB - ${diagramName} Diagram | Visualize Database Schemas`
                        : 'ChartDB - Create & Visualize Database Schema Diagrams'}
                </title>
            </Helmet>
            <section
                className={`bg-background ${isDesktop ? 'h-screen w-screen' : 'h-dvh w-dvw'} flex select-none flex-col overflow-x-hidden`}
            >
                <Suspense
                    fallback={
                        <>
                            <TopNavbarMock />
                            <div className="flex flex-1 items-center justify-center">
                                <Spinner
                                    size={isDesktop ? 'large' : 'medium'}
                                />
                            </div>
                        </>
                    }
                >
                    {isDesktop ? (
                        <EditorDesktopLayoutLazy
                            initialDiagram={initialDiagram}
                        />
                    ) : (
                        <EditorMobileLayoutLazy
                            initialDiagram={initialDiagram}
                        />
                    )}
                </Suspense>
            </section>
            <Toaster />
        </>
    );
};

export const GraoPage: React.FC = () => (
    <LocalConfigProvider>
        <ThemeProvider>
            <FullScreenLoaderProvider>
                <LayoutProvider>
                    <StorageProvider>
                        <ConfigProvider>
                            <RedoUndoStackProvider>
                                <DiffProvider>
                                    <ChartDBProvider>
                                        <HistoryProvider>
                                            <ReactFlowProvider>
                                                <CanvasProvider>
                                                    <ExportImageProvider>
                                                        <AlertProvider>
                                                            <DialogProvider>
                                                                <KeyboardShortcutsProvider>
                                                                    <EditorPageComponent />
                                                                </KeyboardShortcutsProvider>
                                                            </DialogProvider>
                                                        </AlertProvider>
                                                    </ExportImageProvider>
                                                </CanvasProvider>
                                            </ReactFlowProvider>
                                        </HistoryProvider>
                                    </ChartDBProvider>
                                </DiffProvider>
                            </RedoUndoStackProvider>
                        </ConfigProvider>
                    </StorageProvider>
                </LayoutProvider>
            </FullScreenLoaderProvider>
        </ThemeProvider>
    </LocalConfigProvider>
);
