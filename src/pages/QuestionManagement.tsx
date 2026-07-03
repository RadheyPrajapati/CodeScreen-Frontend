import React, { useEffect, useState } from 'react';
import { questionApi } from '../services/api';
import * as mockDb from '../services/mockDb';
import { FileCode, Plus, Search, Trash2, Sparkles, Loader2, Save, Check } from 'lucide-react';

export const QuestionManagement: React.FC = () => {
  const [questions, setQuestions] = useState<mockDb.Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<mockDb.Question | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState<string[]>(['']);
  const [examples, setExamples] = useState<Array<{ input: string; output: string; explanation?: string }>>([
    { input: '', output: '', explanation: '' }
  ]);
  const [testCases, setTestCases] = useState<Array<{ input: string; output: string; isSample: boolean }>>([
    { input: '', output: '', isSample: false }
  ]);
  const [tags, setTags] = useState<string>('');

  // AI Prompt states
  const [roughQuestion, setRoughQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSavedStatus, setShowSavedStatus] = useState(false);

  const fetchQuestions = async () => {
    try {
      const data = await questionApi.listQuestions();
      setQuestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSelectQuestion = (q: mockDb.Question) => {
    setSelectedQuestion(q);
    
    // Populate form
    setTitle(q.title || '');
    setDescription(q.description || '');
    setDifficulty(q.difficulty || 'medium');
    
    if (q.inputFormat && typeof q.inputFormat === 'object') {
      setInputFormat((q.inputFormat as any).description || (q.inputFormat as any).text || JSON.stringify(q.inputFormat));
    } else {
      setInputFormat(q.inputFormat || '');
    }

    setOutputFormat(q.outputFormat || '');
    setConstraints(q.constraints && q.constraints.length > 0 ? q.constraints.map(c => c || '') : ['']);
    setExamples(
      q.examples && q.examples.length > 0
        ? q.examples.map(ex => ({
            input: ex.input || '',
            output: ex.output || '',
            explanation: ex.explanation || ''
          }))
        : [{ input: '', output: '', explanation: '' }]
    );
    setTestCases(
      q.testCases && q.testCases.length > 0
        ? q.testCases.map(tc => ({
            input: tc.input || '',
            output: tc.output || '',
            isSample: !!tc.isSample
          }))
        : [{ input: '', output: '', isSample: false }]
    );
    setTags(q.tags ? q.tags.join(', ') : '');
  };

  const handleCreateNew = () => {
    setSelectedQuestion(null);
    
    // Clear form
    setTitle('');
    setDescription('');
    setDifficulty('medium');
    setInputFormat('');
    setOutputFormat('');
    setConstraints(['']);
    setExamples([{ input: '', output: '', explanation: '' }]);
    setTestCases([{ input: '', output: '', isSample: false }]);
    setTags('');
  };

  const handleGenerateAI = async () => {
    if (!roughQuestion) {
      alert('Please specify a topic or rough prompt for AI generation.');
      return;
    }

    setAiLoading(true);
    try {
      const generated = (await questionApi.generateQuestion({
        roughQuestion,
        difficulty,
        constraintsLevel: 'standard',
        testCaseCount: 3
      })) as any;

      if (generated) {
        setTitle(generated.title || '');
        setDescription(generated.description || '');
        setDifficulty(generated.difficulty as any || 'medium');
        
        if (generated.inputFormat && typeof generated.inputFormat === 'object') {
          setInputFormat(generated.inputFormat.description || generated.inputFormat.text || JSON.stringify(generated.inputFormat));
        } else {
          setInputFormat(generated.inputFormat || '');
        }

        setOutputFormat(generated.outputFormat || '');
        
        if (Array.isArray(generated.constraints)) {
          setConstraints(generated.constraints.length > 0 ? generated.constraints : ['']);
        } else if (generated.constraints) {
          setConstraints([String(generated.constraints)]);
        } else {
          setConstraints(['']);
        }

        if (Array.isArray(generated.examples) && generated.examples.length > 0) {
          setExamples(generated.examples.map((ex: any) => ({
            input: ex.input || '',
            output: ex.output || '',
            explanation: ex.explanation || ''
          })));
        } else {
          setExamples([{ input: '', output: '', explanation: '' }]);
        }

        if (Array.isArray(generated.testCases) && generated.testCases.length > 0) {
          setTestCases(generated.testCases.map((tc: any) => ({
            input: tc.input || '',
            output: tc.output || '',
            isSample: !!tc.isSample
          })));
        } else {
          setTestCases([{ input: '', output: '', isSample: false }]);
        }

        setTags(Array.isArray(generated.tags) ? generated.tags.join(', ') : (generated.tags || ''));
        setRoughQuestion('');
      }
    } catch (err) {
      console.error(err);
      alert('AI Generation failed. Check backend endpoint.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    const questionPayload = {
      title,
      description,
      difficulty,
      inputFormat,
      outputFormat,
      constraints: constraints.filter(c => c.trim() !== ''),
      examples: examples.filter(ex => ex.input.trim() !== ''),
      testCases: testCases.filter(tc => tc.input.trim() !== ''),
      tags: tags.split(',').map(t => t.trim()).filter(t => t !== '')
    };

    try {
      if (selectedQuestion) {
        // Update
        await questionApi.updateQuestion(selectedQuestion.id, questionPayload);
      } else {
        // Create
        await questionApi.addQuestion(questionPayload);
      }
      setShowSavedStatus(true);
      setTimeout(() => {
        setShowSavedStatus(false);
        setSelectedQuestion(null);
        handleCreateNew();
        fetchQuestions();
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await questionApi.deleteQuestion(id);
        if (selectedQuestion?.id === id) {
          setSelectedQuestion(null);
        }
        fetchQuestions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Helper arrays state changers
  const updateConstraint = (idx: number, val: string) => {
    const list = [...constraints];
    list[idx] = val;
    setConstraints(list);
  };

  const addConstraint = () => setConstraints([...constraints, '']);
  const removeConstraint = (idx: number) => setConstraints(constraints.filter((_, i) => i !== idx));

  const updateExample = (idx: number, field: string, val: string) => {
    const list = [...examples];
    list[idx] = { ...list[idx], [field]: val };
    setExamples(list);
  };

  const addExample = () => setExamples([...examples, { input: '', output: '', explanation: '' }]);
  const removeExample = (idx: number) => setExamples(examples.filter((_, i) => i !== idx));

  const updateTestCase = (idx: number, field: string, val: any) => {
    const list = [...testCases];
    list[idx] = { ...list[idx], [field]: val };
    setTestCases(list);
  };

  const addTestCase = () => setTestCases([...testCases, { input: '', output: '', isSample: false }]);
  const removeTestCase = (idx: number) => setTestCases(testCases.filter((_, i) => i !== idx));

  // Filters
  const filteredList = questions.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (q.tags && q.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left List block */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCode className="h-5.5 w-5.5 text-brand-400" /> Question Bank
          </h2>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-md"
          >
            <Plus className="h-3.5 w-3.5" /> Add Question
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-dark-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions or tags..."
              className="w-full rounded-xl border border-white/5 bg-dark-900/60 py-2.5 pl-9 pr-3 text-xs text-white placeholder-dark-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'easy', 'medium', 'hard'].map((dif) => (
              <button
                key={dif}
                onClick={() => setDifficultyFilter(dif)}
                className={`flex-1 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  difficultyFilter === dif
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-white/5 bg-dark-900/40 text-dark-400 hover:text-white'
                }`}
              >
                {dif}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Scroll */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
          {filteredList.map((q) => (
            <div
              key={q.id}
              onClick={() => handleSelectQuestion(q)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedQuestion?.id === q.id
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-white/5 bg-dark-900/40 hover:bg-dark-800/40 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase border ${
                  q.difficulty === 'easy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  q.difficulty === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {q.difficulty}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(q.id);
                  }}
                  className="text-dark-500 hover:text-rose-400 p-1 rounded transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-white mt-1.5 truncate">{q.title}</h4>
              <p className="text-xs text-dark-400 line-clamp-2 mt-1">{q.description}</p>
              
              <div className="flex flex-wrap gap-1 mt-2.5">
                {q.tags?.map((t: string, i: number) => (
                  <span key={i} className="rounded-full bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] text-dark-300">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Edit/Create pane */}
      <div className="lg:col-span-8">
          <form onSubmit={handleSave} className="rounded-2xl glass p-6 border border-white/5 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedQuestion ? `Edit Question: ${title}` : 'Add Question (AI + Manual)'}
                </h3>
                <p className="text-xs text-dark-400">Configure parameters below manually or via AI assistant seed.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="rounded-lg border border-white/5 hover:border-white/10 px-3 py-1.5 text-xs text-dark-300 hover:text-white bg-white/5"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={saveLoading || showSavedStatus}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow-md disabled:opacity-50 transition-all ${
                    showSavedStatus
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-brand-600 hover:bg-brand-500'
                  }`}
                >
                  {saveLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : showSavedStatus ? (
                    <><Check className="h-3.5 w-3.5" /> Saved!</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /> Save</>
                  )}
                </button>
              </div>
            </div>

            {/* AI seed inside edit view */}
            <div className="rounded-xl bg-brand-500/5 border border-brand-500/10 p-4 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-brand-400 tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> AI Seed Auto-Fill Form
                </span>
                <input
                  type="text"
                  value={roughQuestion}
                  onChange={(e) => setRoughQuestion(e.target.value)}
                  placeholder="e.g. Find Kth largest element in array using quickselect..."
                  className="w-full rounded-lg border border-white/5 bg-dark-950 p-2 text-xs text-white placeholder-dark-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiLoading}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5" /> Autofill</>}
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unique Path Sum"
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Array, Binary Search"
                    className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Problem Statement (Supports Markdown)</label>
              <textarea
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the objective, expectations, and layout metrics..."
                className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none font-sans"
              />
            </div>

            {/* Input & Output Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Input Format</label>
                <textarea
                  rows={2}
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  placeholder="Format details for code runner inputs..."
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Output Format</label>
                <textarea
                  rows={2}
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  placeholder="Expected return structure details..."
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white">Constraints</label>
                <button
                  type="button"
                  onClick={addConstraint}
                  className="text-[10px] text-brand-400 hover:text-white"
                >
                  + Add Constraint
                </button>
              </div>
              <div className="space-y-2">
                {constraints.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={c || ''}
                      onChange={(e) => updateConstraint(i, e.target.value)}
                      placeholder="e.g. 1 <= nums.length <= 10^5"
                      className="flex-1 rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                    />
                    {constraints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeConstraint(i)}
                        className="text-rose-400 hover:text-rose-300 text-xs px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Examples */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white">Examples (Inputs, Outputs & Explanation)</label>
                <button
                  type="button"
                  onClick={addExample}
                  className="text-[10px] text-brand-400 hover:text-white"
                >
                  + Add Example
                </button>
              </div>
              <div className="space-y-3">
                {examples.map((ex, i) => (
                  <div key={i} className="p-3 border border-white/5 bg-dark-900/30 rounded-xl space-y-2 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={ex.input || ''}
                        onChange={(e) => updateExample(i, 'input', e.target.value)}
                        placeholder="Sample Input (e.g. nums = [2,7], target = 9)"
                        className="rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={ex.output || ''}
                        onChange={(e) => updateExample(i, 'output', e.target.value)}
                        placeholder="Sample Output (e.g. [0,1])"
                        className="rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={ex.explanation || ''}
                      onChange={(e) => updateExample(i, 'explanation', e.target.value)}
                      placeholder="Brief Explanation of example result..."
                      className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                    />
                    {examples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExample(i)}
                        className="absolute right-2 top-2 text-rose-400 text-[10px]"
                      >
                        Delete Example ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Test Cases */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white">Execution Test Cases</label>
                <button
                  type="button"
                  onClick={addTestCase}
                  className="text-[10px] text-brand-400 hover:text-white"
                >
                  + Add Test Case
                </button>
              </div>
              <div className="space-y-3">
                {testCases.map((tc, i) => (
                  <div key={i} className="p-3 border border-white/5 bg-dark-900/30 rounded-xl space-y-2 flex gap-3 items-center">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <textarea
                        rows={1}
                        value={tc.input || ''}
                        onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                        placeholder="Test Input (Raw newline parsed)"
                        className="rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                      />
                      <textarea
                        rows={1}
                        value={tc.output || ''}
                        onChange={(e) => updateTestCase(i, 'output', e.target.value)}
                        placeholder="Expected Output (Raw text matched)"
                        className="rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    
                    <label className="flex items-center gap-1.5 text-xs text-dark-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tc.isSample}
                        onChange={(e) => updateTestCase(i, 'isSample', e.target.checked)}
                        className="rounded border-white/10 bg-dark-900 text-brand-600 focus:ring-brand-500"
                      />
                      Sample
                    </label>

                    {testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(i)}
                        className="text-rose-400 text-xs px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>

      </div>
    </div>
  );
};
