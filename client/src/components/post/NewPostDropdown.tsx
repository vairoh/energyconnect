import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MessageSquare, 
  Briefcase, 
  Calendar,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { GeneralPostForm } from "./GeneralPostForm";
import { JobPostForm } from "./JobPostForm";
import { EventPostForm } from "./EventPostForm";

type PostType = 'general' | 'job' | 'event' | null;

interface NewPostDropdownProps {
  onSuccess?: () => void;
}

export function NewPostDropdown({ onSuccess }: NewPostDropdownProps) {
  const [selectedType, setSelectedType] = useState<PostType>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handlePostTypeSelect = (type: PostType) => {
    setSelectedType(type);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedType(null);
    if (onSuccess) onSuccess();
  };

  const postTypes = [
    {
      type: 'general' as PostType,
      icon: MessageSquare,
      label: 'Post',
      description: 'Share thoughts, ideas, or updates',
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      textColor: 'text-blue-700',
    },
    {
      type: 'job' as PostType,
      icon: Briefcase,
      label: 'Jobs',
      description: 'Post job opportunities or seek work',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      textColor: 'text-green-700',
    },
    {
      type: 'event' as PostType,
      icon: Calendar,
      label: 'Event',
      description: 'Announce events or gatherings',
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      textColor: 'text-orange-700',
    },
  ];

  const renderPostForm = () => {
    switch (selectedType) {
      case 'general':
        return <GeneralPostForm onSuccess={handleClose} />;
      case 'job':
        return <JobPostForm onSuccess={handleClose} />;
      case 'event':
        return <EventPostForm onSuccess={handleClose} />;
      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    switch (selectedType) {
      case 'general':
        return 'Create a Post';
      case 'job':
        return 'Post a Job';
      case 'event':
        return 'Create an Event';
      default:
        return 'Create Post';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="mr-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 transition-all duration-200 shadow-lg hover:shadow-xl group" size="sm">
            <div className="flex items-center">
              <Plus className="h-4 w-4 mr-1 group-hover:rotate-90 transition-transform duration-200" />
              <span className="hidden sm:inline">New Post</span>
              <span className="sm:hidden">Post</span>
              <ChevronDown className="h-3 w-3 ml-1 group-hover:rotate-180 transition-transform duration-200" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-2" align="end">
          <div className="space-y-2">
            <div className="px-2 py-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Sparkles className="h-4 w-4" />
                Choose what to create
              </div>
              <p className="text-xs text-gray-500 mt-1">Select the type of post you want to share</p>
            </div>
            
            {postTypes.map((postType) => {
              const IconComponent = postType.icon;
              return (
                <DropdownMenuItem
                  key={postType.type}
                  className={`${postType.bgColor} border-2 border-transparent hover:border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
                  onClick={() => handlePostTypeSelect(postType.type)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${postType.color} text-white shadow-sm`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${postType.textColor}`}>
                        {postType.label}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {postType.description}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b">
              {selectedType && (
                <>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${postTypes.find(p => p.type === selectedType)?.color} text-white shadow-sm`}>
                    {selectedType === 'general' && <MessageSquare className="h-5 w-5" />}
                    {selectedType === 'job' && <Briefcase className="h-5 w-5" />}
                    {selectedType === 'event' && <Calendar className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{getDialogTitle()}</h2>
                    <p className="text-sm text-gray-600">
                      {postTypes.find(p => p.type === selectedType)?.description}
                    </p>
                  </div>
                </>
              )}
            </div>
            {renderPostForm()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 