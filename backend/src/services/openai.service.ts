import OpenAI from 'openai';
import { ParsedResumeData, WorkExperience, InterviewQuestion, AIEvaluation } from '../types';

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Parse resume text and extract structured data
   */
  async parseResumeText(resumeText: string): Promise<ParsedResumeData> {
    try {
      const prompt = `
You are an expert resume parser. Parse the following resume text and extract structured information in JSON format. 
Be thorough and accurate in extracting all relevant details.

Resume Text:
${resumeText}

Please return a JSON object with the following structure:
{
  "personalInfo": {
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "address": "Physical address",
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL",
    "website": "Personal website URL"
  },
  "workExperience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Employment duration",
      "location": "Job location",
      "description": "Job description",
      "skills": ["skill1", "skill2"],
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY or Present"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "Institution name",
      "graduationYear": "YYYY",
      "gpa": "GPA if mentioned",
      "relevantCoursework": ["course1", "course2"]
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "summary": "Professional summary or objective"
}

Only return the JSON object, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response
      try {
        const parsedData = JSON.parse(content) as ParsedResumeData;
        return parsedData;
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
      }
    } catch (error) {
      console.error('Error parsing resume with OpenAI:', error);
      throw new Error(`Resume parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate interview questions based on work experience
   */
  async generateInterviewQuestions(workExperience: WorkExperience[]): Promise<InterviewQuestion[]> {
    try {
      const experienceContext = workExperience.map(exp => ({
        title: exp.title,
        company: exp.company,
        duration: exp.duration,
        description: exp.description,
        skills: exp.skills
      }));

      const prompt = `
You are an expert technical interviewer. Based on the following work experience, generate exactly 5 tailored interview questions that would help assess this candidate's skills, experience, and fit for similar roles.

Work Experience:
${JSON.stringify(experienceContext, null, 2)}

Generate questions that cover:
1. Technical/specific experience from their background
2. Problem-solving and challenges they've faced
3. Leadership and collaboration (if applicable)
4. Industry-specific knowledge
5. Future goals and growth

For each question, specify the type: "experience", "technical", "behavioral", or "situational"

Return a JSON array with the following structure:
[
  {
    "questionText": "Your tailored question based on their experience",
    "questionType": "experience|technical|behavioral|situational",
    "orderIndex": 1,
    "isRequired": true
  }
]

Only return the JSON array, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        const questions = JSON.parse(content);
        
        // Validate and format questions
        return questions.map((q: any, index: number) => ({
          id: '', // Will be set when saving to database
          sessionId: '', // Will be set when creating session
          questionText: q.questionText,
          questionType: q.questionType || 'experience',
          orderIndex: index + 1,
          isRequired: q.isRequired !== false,
        }));
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
      }
    } catch (error) {
      console.error('Error generating interview questions with OpenAI:', error);
      throw new Error(`Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Evaluate interview response quality and provide feedback
   */
  async evaluateResponse(
    question: string,
    response: string,
    expectedSkills: string[],
    workContext: WorkExperience[]
  ): Promise<AIEvaluation> {
    try {
      const contextInfo = {
        question,
        response,
        expectedSkills,
        workExperience: workContext.map(exp => ({
          title: exp.title,
          company: exp.company,
          skills: exp.skills
        }))
      };

      const prompt = `
You are an expert interview evaluator. Evaluate the following interview response based on relevance, clarity, completeness, and technical accuracy (if applicable).

Question: ${question}
Response: ${response}
Expected Skills/Context: ${expectedSkills.join(', ')}
Candidate's Background: ${JSON.stringify(contextInfo.workExperience, null, 2)}

Evaluate the response on a scale of 0-10 for each criterion and provide detailed feedback.

Return a JSON object with the following structure:
{
  "relevance": 8,
  "clarity": 7,
  "completeness": 6,
  "technicalAccuracy": 9,
  "overallScore": 7.5,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "detailedFeedback": "Comprehensive feedback about the response quality, what was good, and how to improve"
}

Consider:
- How well does the response answer the specific question asked?
- Is the response clear and well-structured?
- Does it demonstrate relevant experience and skills?
- Are there specific examples or details provided?
- Is the technical information accurate (if applicable)?

Only return the JSON object, no additional text.
`;

      const response_ai = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const content = response_ai.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        const evaluation = JSON.parse(content) as AIEvaluation;
        return evaluation;
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
      }
    } catch (error) {
      console.error('Error evaluating response with OpenAI:', error);
      throw new Error(`Response evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate overall interview feedback based on all responses
   */
  async generateOverallFeedback(
    questionResponses: Array<{
      question: string;
      response: string;
      evaluation: AIEvaluation;
    }>,
    candidateProfile: ParsedResumeData
  ): Promise<{ overallScore: number; feedback: string; strengths: string[]; improvements: string[] }> {
    try {
      const prompt = `
You are an expert interview evaluator. Based on the following interview performance, provide comprehensive overall feedback.

Candidate Profile:
${JSON.stringify(candidateProfile, null, 2)}

Interview Performance:
${JSON.stringify(questionResponses, null, 2)}

Provide overall feedback including:
1. Calculate an overall interview score (0-10)
2. Identify key strengths demonstrated
3. Identify areas for improvement
4. Provide detailed feedback for career development

Return a JSON object with the following structure:
{
  "overallScore": 7.5,
  "feedback": "Comprehensive overall feedback about the interview performance",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"]
}

Only return the JSON object, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        const overallFeedback = JSON.parse(content);
        return overallFeedback;
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
      }
    } catch (error) {
      console.error('Error generating overall feedback with OpenAI:', error);
      throw new Error(`Overall feedback generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
