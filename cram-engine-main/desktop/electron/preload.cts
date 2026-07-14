import { contextBridge, ipcRenderer } from 'electron';

try {
  contextBridge.exposeInMainWorld('cramEngine', {
    selectProjectFolder: () => ipcRenderer.invoke('dialog:selectProjectFolder'),
    selectUploadFiles: () => ipcRenderer.invoke('dialog:selectUploadFiles'),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
    fetchModels: () => ipcRenderer.invoke('settings:fetchModels'),
    listProjects: () => ipcRenderer.invoke('projects:list'),
    createProject: (input: unknown) => ipcRenderer.invoke('projects:create', input),
    openProject: (projectId: string) => ipcRenderer.invoke('projects:open', projectId),
    renameProject: (projectId: string, name: string) => ipcRenderer.invoke('projects:rename', projectId, name),
    deleteProject: (projectId: string) => ipcRenderer.invoke('projects:delete', projectId),
    updateProjectModel: (projectId: string, model: string) => ipcRenderer.invoke('projects:updateModel', projectId, model),
    saveProjectConfig: (projectId: string, content: string) => ipcRenderer.invoke('projects:saveConfig', projectId, content),
    saveProjectProgress: (projectId: string, content: string) => ipcRenderer.invoke('projects:saveProgress', projectId, content),
    importProjectFiles: (projectId: string, filePaths: string[]) => ipcRenderer.invoke('projects:importFiles', projectId, filePaths),
    previewQuestionsFromText: (text: string, source: string, sourceName?: string) => ipcRenderer.invoke('questions:previewText', text, source, sourceName),
    previewQuestionsFromFiles: (filePaths: string[]) => ipcRenderer.invoke('questions:previewFiles', filePaths),
    addQuestions: (projectId: string, drafts: unknown[]) => ipcRenderer.invoke('questions:add', projectId, drafts),
    updateQuestion: (projectId: string, question: unknown) => ipcRenderer.invoke('questions:update', projectId, question),
    getKnowledgeResources: (projectId: string, knowledgePoint: string) => ipcRenderer.invoke('resources:get', projectId, knowledgePoint),
    openKnowledgeResource: (projectId: string, resource: unknown) => ipcRenderer.invoke('resources:open', projectId, resource),
    runProjectChat: (projectId: string, input: string) => ipcRenderer.invoke('projects:chat', projectId, input),
    addKnowledgeBaseEntry: (projectId: string, entry: unknown) => ipcRenderer.invoke('knowledgeBase:addEntry', projectId, entry),
    deleteKnowledgeBaseEntry: (projectId: string, entryId: string) => ipcRenderer.invoke('knowledgeBase:deleteEntry', projectId, entryId),
    draftKnowledgeBaseEntry: (projectId: string, source: 'chat' | 'upload', payload: unknown) => ipcRenderer.invoke('knowledgeBase:draftEntry', projectId, source, payload),
    exportProject: (projectId: string) => ipcRenderer.invoke('projects:export', projectId),
    readText: (projectIdOrFilePath: string, filePath?: string) => ipcRenderer.invoke('project:readText', projectIdOrFilePath, filePath),
    saveText: (projectId: string, filePath: string, content: string) => ipcRenderer.invoke('project:saveText', projectId, filePath, content),
    snapshotProject: (projectId: string, root: string) => ipcRenderer.invoke('project:snapshot', projectId, root),
    checkLatex: () => ipcRenderer.invoke('latex:check'),
    // 新增
    getProjectSummary: (projectId: string) => ipcRenderer.invoke('projects:summary', projectId),
    ocrImages: (filePaths: string[]) => ipcRenderer.invoke('ocr:batch', filePaths),
    previewQuestionsFromFileContent: (filePaths: string[]) => ipcRenderer.invoke('questions:previewFilesDirect', filePaths),
    // Phase 1: 课程生成管线
    generateCourseOutline: (input: unknown) => ipcRenderer.invoke('courses:generateOutline', input),
    generateChapterScene: (projectId: string, chapter: unknown) => ipcRenderer.invoke('courses:generateScene', projectId, chapter),
    generateAllScenes: (projectId: string, outline: unknown) => ipcRenderer.invoke('courses:generateAllScenes', projectId, outline),
    loadGeneratedCourse: (projectId: string) => ipcRenderer.invoke('courses:load', projectId),
    saveGeneratedCourse: (projectId: string, course: unknown) => ipcRenderer.invoke('courses:save', projectId, course),
    // Phase 2: 多智能体系统
    createAgentSession: (projectId: string, courseContext: string) => ipcRenderer.invoke('agents:createSession', projectId, courseContext),
    executeAgentAction: (projectId: string, sessionId: string, action: unknown) => ipcRenderer.invoke('agents:executeAction', projectId, sessionId, action),
    loadAgentSession: (projectId: string) => ipcRenderer.invoke('agents:loadSession', projectId),
    // Phase 6: 导出增强
    testConnection: () => ipcRenderer.invoke('settings:testConnection'),
    exportPptx: (projectId: string, courseData: unknown) => ipcRenderer.invoke('export:pptx', projectId, courseData),
    exportInteractiveHtml: (projectId: string, courseData: unknown) => ipcRenderer.invoke('export:html', projectId, courseData)
  });
  console.log('[preload] cramEngine API exposed successfully');
} catch (err) {
  console.error('[preload] Failed to expose cramEngine:', err);
}